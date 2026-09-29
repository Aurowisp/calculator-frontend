# Full System Testing

## 1. 测试环境

- 日期：2026-09-29
- 操作系统：Windows
- Python：3.11.4
- Node.js：24.11.0
- 浏览器：Microsoft Edge Headless（Chrome DevTools Protocol）
- Frontend：`http://localhost:5500/src/index.html`
- Backend：`http://localhost:8000`
- 数据库：SQLite

Frontend 和 Backend 始终作为两个独立项目运行，通过 HTTP/JSON 通信。

## 2. Backend 自动测试

最终结果：`93 passed, 0 failed, 0 errors, 1 warning`。

该 warning 是 FastAPI 测试客户端触发的上游 `StarletteDeprecationWarning`，不影响应用行为。

在 `calculator-backend` 中运行：

```powershell
venv\Scripts\activate
python -m pytest
```

测试使用 pytest 临时目录中的隔离 SQLite 文件，并通过 FastAPI dependency override 替换开发数据库 Session。测试前后开发数据库记录数量保持不变。

覆盖范围：

- 四则运算、优先级、左结合
- 括号、嵌套括号、小数、一元正负号
- Decimal 精确运算与最终 `int | float` JSON normalization
- 非法字符、非法语法、除零、空值、超长输入
- 422 请求模型校验
- History 保存、排序、删除和持久化
- 404 和安全的 500 响应
- `localhost:5500` 与 `127.0.0.1:5500` CORS
- `/health` 无副作用健康检查
- Local SQLite fallback 与 PostgreSQL psycopg URL 配置
- 逗号分隔的 Production CORS Origin 解析

## 3. Frontend 模块测试

最终结果：`7 passed, 0 failed`。

在 `calculator-frontend` 中运行：

```powershell
node tests/frontend-modules.test.mjs
```

验证内容：

- `api.js` 的 POST、GET、DELETE 请求结构
- Backend 错误消息透传
- 网络异常转换为“无法连接后端服务”
- 快速重复点击等号只产生一个计算请求
- 成功计算后只刷新一次 History
- 删除后只重新加载一次 History
- Local/Production API URL 选择与 Production HTTPS 约束
- Calculation POST loading 与 History GET loading 解耦
- 慢 History、History 失败、POST 失败和连续计算状态

## 4. 浏览器端到端测试

浏览器测试文件：`tests/browser-e2e.cjs`。它通过 Chrome DevTools Protocol 操作真实页面，并收集 Network 和 JavaScript Console 事件。

运行前需要：

1. Backend 监听 `localhost:8000`。
2. Frontend 静态服务器监听 `localhost:5500`。
3. Edge 使用 `--remote-debugging-port=9222` 打开 Frontend 页面。

然后运行：

```powershell
node tests/browser-e2e.cjs
```

该测试记录原有 History ID，并在结束时仅删除本次创建的记录，不删除已有开发数据。

## 5. Network 验收结果

真实页面测试得到以下业务请求数量：

| 用户动作 | POST calculate | GET history | DELETE history |
|---|---:|---:|---:|
| 页面首次加载 | 0 | 1 | 0 |
| 计算 `55+6` | 1 | 1 | 0 |
| 快速连续点击两次等号 | 1 | 1 | 0 |
| 非法表达式 | 1 | 0 | 0 |
| 删除一条记录 | 0 | 1 | 1 |
| 刷新 Frontend | 0 | 1 | 0 |

CORS 场景可能额外出现正常的 OPTIONS 预检；OPTIONS 不属于重复业务请求。

## 6. 测试矩阵

| Test Case | Input / Action | Expected | Actual | Status |
|---|---|---|---|---|
| Health | `GET /` | 200 + running message | 符合 | PASS |
| Addition | `1+2` | 3 | 3 | PASS |
| Subtraction | `5-3` | 2 | 2 | PASS |
| Multiplication | `4*6` | 24 | 24 | PASS |
| Division | `8/2` | 4 | 4 | PASS |
| Precedence | `1+2*3` | 7 | 7 | PASS |
| Parentheses | `(1+2)*3` | 9 | 9 | PASS |
| Nested parentheses | `2*(3+(4*5))` | 46 | 46 | PASS |
| Left associativity | `10-3-2`, `8/4/2` | 5, 1 | 5, 1 | PASS |
| Decimal | `1.5+2.3`, `.5+1` | 3.8, 1.5 | 3.8, 1.5 | PASS |
| Decimal precision | `2.3+5.6`, `0.1+0.2` | 7.9, 0.3 | 7.9, 0.3 | PASS |
| Decimal operations | `1.2-1.1`, `0.1*0.2`, `0.3/0.1` | 0.1, 0.02, 3 | 符合 | PASS |
| Unary signs | `-5+8`, `3*-2`, `3--2` | 3, -6, 5 | 3, -6, 5 | PASS |
| Invalid input | `abc`, `1+*2`, `()` | HTTP 400 | HTTP 400 | PASS |
| Division by zero | `10/0`, `1/(2-2)` | HTTP 400 | HTTP 400 | PASS |
| Missing field | `{}` | HTTP 422 | HTTP 422 | PASS |
| Empty expression | `{"expression":""}` | HTTP 400 | HTTP 400 | PASS |
| Length limit | 201 characters | HTTP 400 | HTTP 400 | PASS |
| Save History | Successful calculation | Database record | Record found | PASS |
| Failed History | Invalid/zero division | No new record | Count unchanged | PASS |
| History ordering | Multiple calculations | Newest first | ID descending | PASS |
| Frontend refresh | Reload page | History remains | History rendered | PASS |
| Backend restart | Stop and restart | History remains | Record remained | PASS |
| Delete History | Delete existing ID | Record disappears | Record absent | PASS |
| Delete missing | ID `999999999` | HTTP 404 | HTTP 404 | PASS |
| Empty History | Isolated empty database | `[]` | `[]` | PASS |
| CORS localhost | Origin `localhost:5500` | Allowed | Allowed | PASS |
| CORS loopback | Origin `127.0.0.1:5500` | Allowed | Allowed | PASS |
| Duplicate submit | Rapid `=` clicks | One POST | One POST | PASS |
| Duplicate refresh | Successful calculate | One GET History | One GET | PASS |
| Slow History | POST complete, GET delayed | Result/button ready first | 符合 | PASS |
| History failure | Calculate succeeds, GET fails | Result remains successful | 符合 | PASS |
| Delete refresh | Delete button | DELETE + one GET | 符合 | PASS |
| Backend Offline | Calculate `1+2` offline | No result + error | No result | PASS |
| Offline UI | Input and clear offline | Still interactive | Interactive | PASS |
| Console | Normal/error flows | No JS exception | 0 errors | PASS |
| HTML safety | History expression | `textContent` | `textContent` | PASS |

## 7. 持久化测试

测试流程：

1. 使用文件型 SQLite 数据库启动 Backend。
2. 计算 `123+456`，确认 History 中存在结果 579。
3. 停止并重新启动 Backend。
4. 再次查询 History，原记录仍然存在。
5. 刷新 Frontend，页面重新 GET 并显示同一记录。

结果：PASS。History 来自 SQLite，而不是 JavaScript 内存或浏览器存储。

## 8. Backend Offline 测试

浏览器通过 DevTools Protocol 模拟完全离线：

- 输入 `1+2` 后无法获得 3。
- 页面显示“无法连接后端服务”。
- 数字、运算符和清除按钮继续工作。
- 没有未处理 Promise rejection 或 JavaScript exception。

结果：PASS。

## 9. 静态安全与架构检查

- Frontend 中没有 `eval()`、`Function()` 或数学 Parser/Evaluator。
- Frontend 中没有 LocalStorage、SessionStorage 或 IndexedDB History。
- `fetch` 只出现在 `api.js`。
- History 表达式通过 `textContent` 渲染。
- Backend 源码没有写死 Windows 项目绝对路径。
- `requirements.txt` 只包含项目运行和测试需要的依赖。
- 两个项目均保留各自的 `codestyle.md` 和 Git 仓库。

## 10. 后续截图清单

建议为课程博客保留以下浏览器截图：

1. Calculator 主界面
2. Addition
3. Subtraction
4. Multiplication
5. Division
6. Decimal
7. Compound expression
8. Parentheses
9. Unary negative
10. Invalid expression
11. Division by zero
12. History 列表
13. 刷新后 History 持久化
14. 删除 History
15. DevTools Network 中的 POST + GET
16. DevTools Network 中的 DELETE + GET
17. Console 无 JavaScript 异常

## 11. 已知测试提示

当前 FastAPI/Starlette TestClient 会输出一条上游依赖弃用 warning，但不影响测试成功，也没有 failed 或 error。后续依赖升级阶段可统一处理，不需要在 Phase 7 改动业务代码。

## 12. Deployment readiness 验证

- `DATABASE_URL` 未设置时使用项目根目录 SQLite。
- `postgres://` 和 `postgresql://` 会转换为 `postgresql+psycopg://`。
- SQLAlchemy 已验证加载 `psycopg` PostgreSQL dialect，未连接真实 Cloud Database。
- `$PORT` 测试实例成功监听 `0.0.0.0:8010`，`GET /health` 返回 200。
- 自定义 `https://example.github.io` CORS Origin 预检返回 200。
- Repository 根 `index.html` 能跳转到相对路径 `./src/index.html`。
- Production API placeholder 使用 HTTPS，且非本地 hostname 不会选择 localhost Backend。

## 13. Decimal 与 Loading 回归

- Parser 从原始 NUMBER token 直接构造 `Decimal`，不经过 `float`。
- Evaluator 使用 precision 256 的局部 Decimal context，并只在 API 边界转换为 `int | float`。
- `2.3+5.6 → 7.9` 和 `0.1+0.2 → 0.3` 的 API 与 History 结果均通过。
- 浏览器 E2E 将 History 响应人为延迟 1.2 秒；Result 在 POST 完成后立即显示，等号恢复可用，History 保持独立 loading。
- History 刷新失败不会覆盖已经成功显示的 Calculation Result。
