def main():
    import sys

    from PySide6.QtWidgets import QApplication

    from ui.bootstrap import ensure_runtime_files
    from ui.login_window import LoginWindow
    from ui.state_helper import resource_path

    ensure_runtime_files()

    app = QApplication(sys.argv)

    style_path = resource_path("ui", "styles.qss")
    try:
        with open(style_path, "r", encoding="utf-8") as f:
            app.setStyleSheet(f.read())
    except OSError:
        pass

    win = LoginWindow()
    win.show()
    sys.exit(app.exec())
