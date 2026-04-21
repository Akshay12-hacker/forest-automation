import os
import sys

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QApplication,
    QFrame,
    QHBoxLayout,
    QLabel,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QTextEdit,
    QTabWidget,
    QVBoxLayout,
    QWidget,
    QDialog,
    QSplitter,
)

from security.license_manager import get_license_info, verify_license
from security.machine_lock import get_machine_id
from ui.automation_controller import (
    pause_automation,
    resume_automation,
    start_automation,
    stop_automation,
)
from ui.config_editor import ConfigEditor
from ui.csv_editor import CsvEditor
from ui.state_helper import app_path


class Dashboard(QMainWindow):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Forest Automation - Officer Dashboard")
        self.setGeometry(220, 80, 1380, 820)

        central_widget = QWidget(self)
        self.setCentralWidget(central_widget)

        main_layout = QHBoxLayout()
        main_layout.setContentsMargins(18, 18, 18, 18)
        main_layout.setSpacing(18)
        central_widget.setLayout(main_layout)

        self.tab_widget = QTabWidget()
        self.tab_widget.setMinimumHeight(360)
        self.single_editor = CsvEditor(
            file_name="singleTourist.csv",
            title="Single Seat Data",
            helper_text="Use this list when the permit page opens the single-seat visitor form.",
        )
        self.full_editor = CsvEditor(
            file_name="tourists.csv",
            title="Full Vehicle Data",
            helper_text="Use this list for the full-vehicle booking flow and keep rows in booking order.",
        )
        self.config_editor = ConfigEditor()

        self.tab_widget.addTab(self.single_editor, "Single Seat")
        self.tab_widget.addTab(self.full_editor, "Full Vehicle")
        self.tab_widget.addTab(self.config_editor, "Settings")

        sidebar = self._build_sidebar()
        content = self._build_content_panel()

        main_layout.addWidget(sidebar, 0)
        main_layout.addWidget(content, 1)

        self.check_license()

    def _build_sidebar(self):
        panel = QFrame()
        panel.setObjectName("sidebarPanel")
        panel.setFixedWidth(270)

        layout = QVBoxLayout(panel)
        layout.setContentsMargins(18, 18, 18, 18)
        layout.setSpacing(14)

        title = QLabel("Forest Automation")
        title.setObjectName("appTitle")

        subtitle = QLabel(
            "Prepare booking data, review status, and run the permit flow without jumping across screens."
        )
        subtitle.setWordWrap(True)
        subtitle.setObjectName("mutedLabel")

        single_card = self._build_flow_card(
            "Single Seat",
            "Best for seat-by-seat booking and seathead bulk selection pages.",
            lambda: self.focus_tab(0),
        )
        full_card = self._build_flow_card(
            "Full Vehicle",
            "Review the shared vehicle passenger list before the booking page opens.",
            lambda: self.focus_tab(1),
        )
        settings_card = self._build_flow_card(
            "Settings",
            "Update browser delay, timeout, and license details from one place.",
            lambda: self.focus_tab(2),
        )

        self.status_badge = QLabel("Idle")
        self.status_badge.setObjectName("statusBadge")
        self.status_badge.setAlignment(Qt.AlignCenter)

        self.license_summary = QLabel("Checking license...")
        self.license_summary.setWordWrap(True)
        self.license_summary.setObjectName("mutedLabel")

        helper = QLabel(
            "Recommended order:\n1. Review data\n2. Validate CSV\n3. Start booking\n4. Watch live logs"
        )
        helper.setWordWrap(True)
        helper.setObjectName("helperCard")

        layout.addWidget(title)
        layout.addWidget(subtitle)
        layout.addWidget(single_card)
        layout.addWidget(full_card)
        layout.addWidget(settings_card)
        layout.addStretch(1)
        layout.addWidget(QLabel("Run Status"))
        layout.addWidget(self.status_badge)
        layout.addWidget(self.license_summary)
        layout.addWidget(helper)
        return panel

    def _build_flow_card(self, title, description, callback):
        card = QFrame()
        card.setObjectName("flowCard")
        layout = QVBoxLayout(card)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(8)

        heading = QLabel(title)
        heading.setObjectName("cardTitle")

        body = QLabel(description)
        body.setWordWrap(True)
        body.setObjectName("mutedLabel")

        button = QPushButton(f"Open {title}")
        button.clicked.connect(callback)

        layout.addWidget(heading)
        layout.addWidget(body)
        layout.addWidget(button)
        return card

    def _build_content_panel(self):
        panel = QWidget()
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(16)

        header = QFrame()
        header.setObjectName("headerPanel")
        header_layout = QVBoxLayout(header)
        header_layout.setContentsMargins(18, 18, 18, 18)
        header_layout.setSpacing(12)

        title = QLabel("Booking Control Center")
        title.setObjectName("pageTitle")

        self.status = QLabel("Status: Idle")
        self.status.setObjectName("statusText")

        self.license_label = QLabel("License: Not Activated")
        self.license_label.setObjectName("mutedLabel")

        controls = QHBoxLayout()
        controls.setSpacing(10)

        self.btn_start = QPushButton("Start Booking")
        self.btn_pause = QPushButton("Pause")
        self.btn_resume = QPushButton("Resume")
        self.btn_stop = QPushButton("Stop Booking")
        self.btn_machine = QPushButton("Show Machine ID")

        self.btn_start.clicked.connect(self.start_flow)
        self.btn_pause.clicked.connect(self.pause_flow)
        self.btn_resume.clicked.connect(self.resume_flow)
        self.btn_stop.clicked.connect(self.stop_flow)
        self.btn_machine.clicked.connect(self.show_machine_id)

        controls.addWidget(self.btn_start)
        controls.addWidget(self.btn_pause)
        controls.addWidget(self.btn_resume)
        controls.addWidget(self.btn_stop)
        controls.addStretch(1)
        controls.addWidget(self.btn_machine)

        header_layout.addWidget(title)
        header_layout.addWidget(self.status)
        header_layout.addWidget(self.license_label)
        header_layout.addLayout(controls)

        log_frame = QFrame()
        log_frame.setObjectName("logPanel")
        log_layout = QVBoxLayout(log_frame)
        log_layout.setContentsMargins(14, 14, 14, 14)
        log_layout.setSpacing(10)

        log_title = QLabel("Live Logs")
        log_title.setObjectName("cardTitle")

        self.logs = QTextEdit()
        self.logs.setReadOnly(True)
        self.logs.setMinimumHeight(180)
        self.logs.setPlaceholderText("Node and browser logs will appear here during automation.")

        log_layout.addWidget(log_title)
        content_splitter = QSplitter(Qt.Vertical)
        content_splitter.setChildrenCollapsible(False)
        content_splitter.addWidget(self.tab_widget)
        content_splitter.addWidget(self.logs)
        content_splitter.setStretchFactor(0, 3)
        content_splitter.setStretchFactor(1, 1)
        content_splitter.setSizes([460, 180])

        log_layout.addWidget(content_splitter, 1)

        layout.addWidget(header)
        layout.addWidget(log_frame, 1)
        return panel

    def focus_tab(self, index):
        self.tab_widget.setCurrentIndex(index)
        tab_name = self.tab_widget.tabText(index)
        self.log(f"Opened {tab_name} panel")

    def log(self, message):
        self.logs.append(message)
        self.logs.ensureCursorVisible()

    def start_flow(self):
        license_file = app_path("config", "license.key")

        if not os.path.exists(license_file):
            self.log("No license found")
            QMessageBox.warning(self, "License Missing", "Activate a valid license before starting.")
            return

        with open(license_file, encoding="utf-8") as f:
            key = f.read().strip()

        if not verify_license(key):
            self.log("Invalid license")
            QMessageBox.critical(self, "License Error", "The saved license is invalid or tampered.")
            return

        self.status.setText("Status: Running")
        self.status_badge.setText("Running")
        self.log("Automation started")
        start_automation(self.log)

    def pause_flow(self):
        self.status.setText("Status: Paused")
        self.status_badge.setText("Paused")
        self.log("Automation paused")
        pause_automation(self.log)

    def resume_flow(self):
        self.status.setText("Status: Running")
        self.status_badge.setText("Running")
        self.log("Resume requested")
        resume_automation(self.log)

    def stop_flow(self):
        self.status.setText("Status: Stopped")
        self.status_badge.setText("Stopped")
        self.log("Automation stopped")
        stop_automation(self.log)

    def show_machine_id(self):
        machine_id = get_machine_id()
        dialog = QDialog(self)
        dialog.setWindowTitle("Machine ID")
        dialog.setMinimumWidth(520)

        layout = QVBoxLayout(dialog)

        info = QLabel("Send this ID to the vendor for license generation.")
        info.setWordWrap(True)

        machine_id_view = QTextEdit()
        machine_id_view.setReadOnly(True)
        machine_id_view.setPlainText(machine_id)
        machine_id_view.setFixedHeight(90)

        button_row = QHBoxLayout()
        copy_button = QPushButton("Copy Machine ID")
        close_button = QPushButton("Close")

        copy_button.clicked.connect(lambda: QApplication.clipboard().setText(machine_id))
        copy_button.clicked.connect(lambda: self.log("Machine ID copied to clipboard"))
        copy_button.clicked.connect(dialog.accept)
        close_button.clicked.connect(dialog.accept)

        button_row.addWidget(copy_button)
        button_row.addStretch(1)
        button_row.addWidget(close_button)

        layout.addWidget(info)
        layout.addWidget(machine_id_view)
        layout.addLayout(button_row)

        dialog.exec()

    def check_license(self):
        license_file = app_path("config", "license.key")
        if not os.path.exists(license_file):
            self.license_label.setText("License: No license found")
            self.license_summary.setText("No active license detected.")
            return

        with open(license_file, encoding="utf-8") as f:
            key = f.read().strip()

        if not verify_license(key):
            QMessageBox.critical(self, "License Error", "Invalid or tampered license")
            sys.exit()

        info = get_license_info(key)
        if not info:
            self.license_label.setText("License: Invalid license data")
            self.license_summary.setText("License file exists but could not be read.")
            return

        days = info["days_left"]
        self.license_label.setText(f"License: Active ({days} days left)")
        self.license_summary.setText(f"License active. {days} day(s) remaining.")

        if days <= 0:
            QMessageBox.critical(self, "License Expired", "Your license has expired")
            sys.exit()

        if days < 10:
            QMessageBox.warning(
                self,
                "License Expiring",
                f"Your license will expire in {days} days",
            )


if __name__ == "__main__":
    app = QApplication(sys.argv)
    win = Dashboard()
    win.show()
    sys.exit(app.exec())
