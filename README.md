# Calculator Frontend

软件工程课程的前后端分离计算器系统前端。Frontend 使用 HTML、CSS 和 JavaScript，通过 REST API 连接独立的 FastAPI Backend。

## 功能

- 输入数字 `0-9`
- 输入加、减、乘、除、括号和小数点
- 清除当前表达式
- 展示当前表达式和后端返回的结果
- 页面加载时读取 Backend 数据库历史
- 成功计算后自动刷新历史
- 删除指定数据库历史记录
- 统一处理 Backend 和网络错误

Frontend 不会计算表达式，也没有使用 `eval()`、`Function()` 或本地 Parser/Evaluator。所有数学计算和最终校验都由 Backend 完成。

## 项目结构

```text
calculator-frontend/
├── README.md
├── codestyle.md
└── src/
    ├── index.html            # 页面结构
    ├── css/
    │   └── styles.css        # 页面样式与响应式布局
    └── js/
        ├── api.js            # 后端 API 调用
        ├── calculator.js     # 表达式输入与计算请求流程
        ├── history.js        # 历史加载、删除和刷新流程
        ├── ui.js             # 页面状态与安全 DOM 渲染
        └── main.js           # 应用入口与模块装配
```

## 本地运行

ES Modules 需要通过 HTTP 服务加载，不应使用 `file:///` 直接打开。推荐使用 VS Code Live Server，在 `5500` 端口访问：

```text
http://127.0.0.1:5500/src/index.html
```

如果 VS Code 打开的是同时包含 Frontend 和 Backend 的
`D:\Software-engineering` 目录，请使用工作区中的 `.vscode/settings.json`。
该配置将 Live Server 根目录限制为 `calculator-frontend`，并忽略 Backend
和 SQLite 数据库文件，避免计算写入数据库时触发 Frontend 自动刷新。
配置新增或修改后，需要停止并重新启动一次 Live Server。

也可以在项目目录运行：

```bash
python -m http.server 5500
```

然后访问 `http://127.0.0.1:5500/src/index.html`。

Backend 需要独立启动并监听 `http://localhost:8000`。

## Backend Integration

开发 API 地址集中定义在 `src/js/api.js`：

```javascript
export const API_BASE_URL = 'http://localhost:8000';
```

后续部署只需要修改这一处。Frontend 使用以下接口：

- `POST /api/calculate`
- `GET /api/history`
- `DELETE /api/history/{id}`

点击等号后发送：

```http
POST /api/calculate
Content-Type: application/json
```

请求体：

```json
{
  "expression": "12+3"
}
```

前端期望后端返回：

```json
{
  "success": true,
  "expression": "12+3",
  "result": 15
}
```

成功后，Frontend 重新调用 `GET /api/history`，历史区域始终以 Backend SQLite 数据为准。删除记录成功后也会重新请求历史，而不是仅删除本地 DOM。

如果 Backend 返回 400、404、422 或 500，页面会优先显示响应中的错误信息。Backend 未启动时显示“无法连接后端服务”，不会退回到 JavaScript 本地计算。

## 开发启动顺序

1. 在 `calculator-backend` 中激活虚拟环境并运行：

   ```powershell
   uvicorn src.main:app
   ```

2. 在 `calculator-frontend` 中启动 Live Server 或静态服务器。
3. 打开 `http://127.0.0.1:5500/src/index.html`。
4. 在浏览器 Network 面板中可观察计算时的 POST/GET，以及删除时的 DELETE/GET。

历史记录不使用 LocalStorage、SessionStorage、IndexedDB 或内存数组作为数据源。

## 测试

Frontend 模块测试：

```powershell
node tests/frontend-modules.test.mjs
```

完整的 Backend、API、浏览器端到端、持久化、离线及测试矩阵记录参见 [TESTING.md](./TESTING.md)。
