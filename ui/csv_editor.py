import csv
from PySide6.QtWidgets import QTableWidget, QTableWidgetItem

CSV_PATH = "../data/tourists.csv"

def load_csv(table):
    table.setRowCount(0)
    with open(CSV_PATH, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = next(reader)
        table.setColumnCount(len(headers))
        table.setHorizontalHeaderLabels(headers)

        for row in reader:
            r = table.rowCount()
            table.insertRow(r)
            for c, val in enumerate(row):
                table.setItem(r, c, QTableWidgetItem(val))

def save_csv(table):
    with open(CSV_PATH, "w", newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        headers = [table.horizontalHeaderItem(i).text() for i in range(table.columnCount())]
        writer.writerow(headers)

        for r in range(table.rowCount()):
            writer.writerow([
                table.item(r, c).text() if table.item(r, c) else ""
                for c in range(table.columnCount())
            ])
