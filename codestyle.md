# JavaScript Code Style

本项目的 JavaScript 代码风格参考 [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html)。

## 基本规则

- 使用 UTF-8 编码，文件末尾保留换行。
- 使用 2 个空格缩进，不使用 Tab。
- 每条语句以分号结尾。
- 字符串默认使用单引号。
- 每行建议不超过 100 个字符；必要时按语义换行。
- 使用尾随逗号，减少后续修改产生的无关差异。

## 命名

- 类使用 `UpperCamelCase`，例如 `CalculatorController`。
- 变量、函数和方法使用 `lowerCamelCase`，例如 `requestCalculation`。
- 常量使用 `UPPER_SNAKE_CASE`，例如 `API_ENDPOINT`。
- 命名应表达用途，避免无意义缩写和单字母名称。

## 语言特性

- 默认使用 `const`；确实需要重新赋值时使用 `let`；禁止使用 `var`。
- 使用严格相等运算符 `===` 和 `!==`。
- 使用 ES Modules 的 `import` 和 `export` 组织代码。
- 优先使用 `async`/`await` 处理异步请求。
- 禁止使用 `eval()`。
- 禁止在前端实现表达式运算或任何数学计算。

## 模块职责

- `api.js` 只负责与后端通信。
- `calculator.js` 只负责交互状态和 DOM 更新。
- `main.js` 只负责查询页面元素、组装依赖和启动应用。
- 函数和方法应保持单一职责，避免跨模块共享可变全局状态。

## DOM 与安全

- 使用 `textContent` 写入用户输入和服务端数据，避免注入 HTML。
- 通过事件委托统一处理同类按钮事件。
- 可交互元素应使用语义化 HTML，并提供必要的无障碍标签。

## 注释

- 注释说明设计原因、边界或约束，不重复描述显而易见的代码。
- 公共模块接口使用 JSDoc 说明用途和关键约束。
