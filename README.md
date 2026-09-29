# Calculator Frontend

软件工程课程的前后端分离计算器系统前端。本阶段仅包含 HTML、CSS 和 JavaScript，不包含后端实现。

## 功能

- 输入数字 `0-9`
- 输入加、减、乘、除运算符
- 清除当前表达式
- 展示当前表达式和后端返回的结果
- 在页面中记录成功返回的计算历史
- 点击等号时调用 `api.calculate(expression)`

前端不会计算表达式，也没有使用 `eval()`。所有计算都必须由后端完成。

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
        ├── calculator.js     # 交互状态与页面更新
        └── main.js           # 应用入口与模块装配
```

## 本地运行

ES Modules 需要通过 HTTP 服务加载。可在项目目录执行：

```bash
python -m http.server 8080 -d src
```

然后访问 `http://localhost:8080`。

## API 约定

点击等号后，前端向 `/api/calculate` 发送请求：

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
  "result": 15
}
```

后端尚未接入时，点击等号会在结果区域显示请求错误，这是当前阶段的预期行为。
