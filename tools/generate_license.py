from security.license_manager import generate_license

machine_id = input("Enter Machine ID: ")
days_raw = input("License days (example: 1, 15, 30, 365): ").strip()

try:
    days = int(days_raw)
except ValueError:
    raise SystemExit("License days must be a number.")

if days <= 0:
    raise SystemExit("License days must be greater than 0.")

license_key = generate_license(machine_id, days=days)

print("\n=== LICENSE KEY ===\n")
print(f"Valid for {days} day(s)\n")
print(license_key)
