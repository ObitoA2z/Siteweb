"use client";

import { formatTime } from "@/lib/time";

export type SlotOption = {
  slotId: number;
  startAt: string;
  endAt: string;
};

type Props = {
  slots: SlotOption[];
  selectedSlotId: number | null;
  onSelect: (slotId: number) => void;
};

export function TimeSlots({ slots, selectedSlotId, onSelect }: Props) {
  if (slots.length === 0) {
    return <p className="text-sm text-[#5f4754]">Aucun creneau disponible pour cette date.</p>;
  }

  return (
    /* 3 colonnes sur mobile, 4 sur sm+ pour des boutons plus grands au doigt */
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
      {slots.map((slot) => {
        const active = selectedSlotId === slot.slotId;
        return (
          <button
            key={slot.slotId}
            type="button"
            onClick={() => onSelect(slot.slotId)}
            className={`rounded-xl border px-2 py-3 text-sm font-semibold transition min-h-[48px] touch-action-manipulation ${
              active
                ? "border-[#2d1e27] bg-[#2d1e27] text-white"
                : "border-[#2d1e2733] bg-white/80 text-[#2d1e27] hover:border-[#2d1e27]"
            }`}
          >
            {formatTime(slot.startAt)}
          </button>
        );
      })}
    </div>
  );
}
