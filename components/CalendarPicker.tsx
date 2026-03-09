"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
  min?: string;
};

export function CalendarPicker({ value, onChange, min }: Props) {
  return (
    <div className="space-y-2">
      <label htmlFor="booking-date" className="block text-sm font-semibold">
        Date
      </label>
      <input
        id="booking-date"
        type="date"
        value={value}
        min={min}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
