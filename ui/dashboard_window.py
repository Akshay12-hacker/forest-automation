from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget,
    QVBoxLayout, QHBoxLayout,
    QPushButton, QLabel, QTextEdit, QTabWidget
)
import sys

from ui.automation_controller import (
    start_automation,
    stop_automation,
    pause_automation,
    resume_automation
)
from ui.csv_editor import CsvEditor
from ui.config_editor import ConfigEditor


class Dashboard(QMainWindow):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Forest Automation - Officer Dashboard")
        self.setGeometry(300, 100, 1100, 650)

        # ✅ ONE central widget
        central_widget = QWidget(self)
        self.setCentralWidget(central_widget)

        # ✅ ROOT layout (horizontal)
        main_layout = QHBoxLayout()
        central_widget.setLayout(main_layout)

        # ================= LEFT PANEL =================
        left_panel = QLabel("Flows\n(Coming Soon)")
        left_panel.setFixedWidth(150)
        left_panel.setStyleSheet("background:#2b2b2b; padding:10px;")

        # ================= CENTER PANEL =================
        center_panel = QWidget()
        center_layout = QVBoxLayout()
        center_panel.setLayout(center_layout)

        self.status = QLabel("Status: Idle")
        self.logs = QTextEdit()
        self.logs.setReadOnly(True)

        btn_start = QPushButton("▶ Start Booking")
        btn_pause = QPushButton("⏸ Pause")
        btn_resume = QPushButton("▶ Resume")
        btn_stop = QPushButton("⏹ Stop Booking")

        btn_start.clicked.connect(self.start_flow)
        btn_pause.clicked.connect(self.pause_flow)
        btn_resume.clicked.connect(self.resume_flow)
        btn_stop.clicked.connect(self.stop_flow)

        center_layout.addWidget(self.status)
        center_layout.addWidget(btn_start)
        center_layout.addWidget(btn_pause)
        center_layout.addWidget(btn_resume)
        center_layout.addWidget(btn_stop)
        center_layout.addWidget(self.logs)

        # ================= RIGHT PANEL =================
        right_panel = QTabWidget()
        right_panel.addTab(CsvEditor(), "Tourist CSV")
        right_panel.addTab(ConfigEditor(), "Config")

        # ================= ASSEMBLE =================
        main_layout.addWidget(left_panel)
        main_layout.addWidget(center_panel, 2)
        main_layout.addWidget(right_panel, 2)

    # ================= LOGGING =================
    def log(self, message):
        self.logs.append(message)
        self.logs.ensureCursorVisible()

    # ================= CONTROL =================
    def start_flow(self):
        self.status.setText("Status: Running")
        self.log("▶ Automation started")
        start_automation(self.log)

    def pause_flow(self):
        self.status.setText("Status: Paused")
        self.log("⏸ Automation paused")
        pause_automation(self.log)

    def resume_flow(self):
        self.status.setText("Status: Running")
        self.log("▶ Resume requested")
        resume_automation(self.log)

    def stop_flow(self):
        self.status.setText("Status: Stopped")
        self.log("⏹ Automation stopped")
        stop_automation(self.log)


if __name__ == "__main__":
    app = QApplication(sys.argv)
    win = Dashboard()
    win.show()
    sys.exit(app.exec())
