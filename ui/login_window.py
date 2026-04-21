import time

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QDialog,
    QFormLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from security.auth import authenticate, create_user, get_user_count
from ui.dashboard_window import Dashboard


class RegisterUserDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Register User")
        self.setMinimumWidth(420)

        title = QLabel("Create User Account")
        title.setObjectName("cardTitle")

        helper = QLabel(
            "Add a new local user to the app database. This account will be stored in users.db."
        )
        helper.setWordWrap(True)
        helper.setObjectName("mutedLabel")

        self.username = QLineEdit()
        self.username.setPlaceholderText("New username")

        self.password = QLineEdit()
        self.password.setPlaceholderText("Password")
        self.password.setEchoMode(QLineEdit.Password)

        self.confirm_password = QLineEdit()
        self.confirm_password.setPlaceholderText("Confirm password")
        self.confirm_password.setEchoMode(QLineEdit.Password)

        form = QFormLayout()
        form.addRow("Username", self.username)
        form.addRow("Password", self.password)
        form.addRow("Confirm", self.confirm_password)

        button_row = QHBoxLayout()
        self.save_button = QPushButton("Create User")
        self.cancel_button = QPushButton("Cancel")

        self.save_button.clicked.connect(self.handle_register)
        self.cancel_button.clicked.connect(self.reject)

        button_row.addWidget(self.save_button)
        button_row.addStretch(1)
        button_row.addWidget(self.cancel_button)

        layout = QVBoxLayout()
        layout.setContentsMargins(18, 18, 18, 18)
        layout.setSpacing(12)
        layout.addWidget(title)
        layout.addWidget(helper)
        layout.addLayout(form)
        layout.addLayout(button_row)
        self.setLayout(layout)

    def handle_register(self):
        username = self.username.text().strip()
        password = self.password.text()
        confirm = self.confirm_password.text()

        if not username or not password or not confirm:
            QMessageBox.warning(self, "Missing Details", "Fill all registration fields.")
            return

        if password != confirm:
            QMessageBox.warning(self, "Password Mismatch", "Passwords do not match.")
            return

        try:
            create_user(username, password)
        except ValueError as exc:
            QMessageBox.warning(self, "Registration Failed", str(exc))
            return
        except Exception as exc:
            QMessageBox.critical(self, "Registration Failed", f"Could not create user:\n{exc}")
            return

        QMessageBox.information(self, "User Created", f"User '{username}' was added successfully.")
        self.accept()


class LoginWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Forest Automation - Login")
        self.setFixedSize(440, 340)

        self.failed_attempts = 0
        self.lockout_until = 0.0

        self.title = QLabel("Officer Login")
        self.title.setObjectName("pageTitle")
        self.title.setAlignment(Qt.AlignLeft)

        self.subtitle = QLabel(
            "Sign in to manage single-seat and full-vehicle permit runs."
        )
        self.subtitle.setWordWrap(True)
        self.subtitle.setObjectName("mutedLabel")

        self.user_status = QLabel("")
        self.user_status.setWordWrap(True)
        self.user_status.setObjectName("mutedLabel")

        self.username = QLineEdit()
        self.username.setPlaceholderText("Username")

        self.password = QLineEdit()
        self.password.setPlaceholderText("Password")
        self.password.setEchoMode(QLineEdit.Password)

        self.login_btn = QPushButton("Login")
        self.register_btn = QPushButton("Register User")

        self.login_btn.clicked.connect(self.handle_login)
        self.register_btn.clicked.connect(self.open_register_dialog)

        button_row = QHBoxLayout()
        button_row.setSpacing(10)
        button_row.addWidget(self.login_btn)
        button_row.addWidget(self.register_btn)

        layout = QVBoxLayout()
        layout.setContentsMargins(22, 22, 22, 22)
        layout.setSpacing(12)
        layout.addWidget(self.title)
        layout.addWidget(self.subtitle)
        layout.addWidget(self.user_status)
        layout.addWidget(self.username)
        layout.addWidget(self.password)
        layout.addStretch(1)
        layout.addLayout(button_row)
        self.setLayout(layout)

        self.refresh_user_status()

    def refresh_user_status(self):
        count = get_user_count()
        if count == 0:
            self.user_status.setText(
                "No registered users found yet. Create the first user to start using the software."
            )
        else:
            self.user_status.setText(f"Registered users in database: {count}")

    def open_register_dialog(self):
        dialog = RegisterUserDialog(self)
        if dialog.exec():
            self.refresh_user_status()

    def handle_login(self):
        now = time.monotonic()
        if now < self.lockout_until:
            remaining = int(self.lockout_until - now)
            QMessageBox.warning(
                self,
                "Temporarily Locked",
                f"Too many failed attempts. Try again in {remaining} seconds.",
            )
            return

        user = self.username.text().strip()
        pwd = self.password.text().strip()

        if not user or not pwd:
            QMessageBox.warning(self, "Error", "Enter both username and password.")
            return

        if authenticate(user, pwd):
            self.failed_attempts = 0
            self.lockout_until = 0.0
            self.hide()
            self.dashboard = Dashboard()
            self.dashboard.show()
        else:
            self.failed_attempts += 1
            if self.failed_attempts >= 5:
                self.lockout_until = time.monotonic() + 30
                self.failed_attempts = 0
            QMessageBox.critical(self, "Denied", "Invalid credentials.")
