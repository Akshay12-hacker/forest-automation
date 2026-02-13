from PySide6.QtWidgets import (
    QWidget, QLabel, QLineEdit,
    QPushButton, QVBoxLayout, QMessageBox
)
from security.auth import authenticate
from ui.dashboard_window import Dashboard

class LoginWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Forest Automation - Login")
        self.setFixedSize(350, 220)

        self.username = QLineEdit()
        self.username.setPlaceholderText("Username")

        self.password = QLineEdit()
        self.password.setPlaceholderText("Password")
        self.password.setEchoMode(QLineEdit.Password)

        self.login_btn = QPushButton("Login")
        self.login_btn.clicked.connect(self.handle_login)

        layout = QVBoxLayout()
        layout.addWidget(QLabel("Officer Login"))
        layout.addWidget(self.username)
        layout.addWidget(self.password)
        layout.addWidget(self.login_btn)

        self.setLayout(layout)

    def handle_login(self):
        user = self.username.text().strip()
        pwd = self.password.text().strip()
        
        if not user or not pwd:
            QMessageBox.warning(self, "Error", "Empty fields")
            return

        if authenticate(user, pwd):
            self.hide()
            self.dashboard = Dashboard()
            self.dashboard.show()
        else:
            QMessageBox.critical(self, "Denied", "Invalid credentials")
        
