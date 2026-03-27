# Contributing to Home Management 🏠

Thank you for your interest in contributing to Home Management! We welcome contributions from everyone and are excited to have you join our community.

---

## ⚖️ Commercial Use & "Safe Harbor" for Contributors

This project uses the **Prosperity Public License**, which generally restricts commercial use. However, we want to make it as easy as possible for developers to contribute!

**Important**: Developing feedback, changes, or additions that you contribute back to this repository under a standardized public software license (such as MIT, Apache 2.0, or BSD) **does not count as "commercial use"**.

This means you and your company can fix bugs and add features without triggering any commercial licensing requirements for that specific activity. We value your help in making this software better for everyone!

---

## 🚀 Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** to your local machine:

   ```bash
   git clone https://github.com/YOUR_USERNAME/home-management.git
   ```

3. **Install dependencies**:

   ```bash
   npm install
   ```

4. **Create a branch** for your feature or bug fix:

   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## 🛠️ Development Standards

To keep the codebase maintainable and consistent, please follow these guidelines:

### 🧩 Component Structure

In this project, components **must** use separate files for logic, templates, and styles. No inline templates or styles are allowed.

```text
component-name/
├── component-name.component.ts      # Logic
├── component-name.component.html    # Template
└── component-name.component.scss    # Styles
```

### ⚛️ Reactive State

We use **Angular Signals** for state management. Avoid using `BehaviorSubject` or complex manual change detection where signals can be used.

### ♻️ DRY (Don't Repeat Yourself)

Before writing new code, check `src/app/shared/` for reusable components or services. If you find yourself duplicating logic, consider extracting it into a shared utility.

---

## ✅ Checklist for Pull Requests

- [ ] **Tests**: Ensure all existing tests pass with `npm test`. If you're adding a new feature, please add corresponding unit tests.
- [ ] **Linting**: Run any available linters and ensure your code follows the project's style.
- [ ] **Documentation**: Update the `README.md` or any relevant documentation if your changes affect how the app is used or deployed.
- [ ] **Commit Messages**: Use descriptive, conventional commit messages (e.g., `feat: add room-based heating tracking`).

---

## 📬 Reporting Issues

If you've found a bug or have a suggestion, please open a **GitHub Issue**. Provide as much detail as possible, including:

- A clear description of the issue.
- Steps to reproduce the bug.
- Expected vs. actual behavior.
- Screenshots if applicable.

---

## ❤️ Recognition

All contributors will be recognized in our documentation!

By contributing to this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).
