def main():
    import sys
    from PySide6.QtWidgets import QApplication
    from ui.login_window import LoginWindow

    app = QApplication(sys.argv)
    win = LoginWindow()
    win.show()
    sys.exit(app.exec())