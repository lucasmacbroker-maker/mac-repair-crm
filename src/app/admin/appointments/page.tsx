"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PRIORITIES } from "@/lib/constants";

interface Appointment {
  id: string;
  clientFirstName: string;
  clientLastName: string;
  clientPhone: string;
  macModel: string;
  faultType: string;
  status: string;
  priority: string;
  appointmentDate: string;
  technician: { id: string; firstName: string; lastName: string } | null;
}

function getWeekBounds(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

function formatWeekday(date: Date) {
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "border-l-gray-300",
  NORMAL: "border-l-blue-400",
  HIGH: "border-l-orange-400",
  URGENT: "border-l-red-500",
};

export default function AppointmentsPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekBounds(new Date()).monday);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const { monday, sunday } = getWeekBounds(weekStart);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/appointments?from=${monday.toISOString()}&to=${sunday.toISOString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setAppointments(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(getWeekBounds(d).monday);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(getWeekBounds(d).monday);
  };

  const goToday = () => {
    setWeekStart(getWeekBounds(new Date()).monday);
  };

  const weekLabel = `${monday.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} — ${sunday.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;

  const isCurrentWeek = isSameDay(weekStart, getWeekBounds(new Date()).monday);

  const totalWeek = appointments.length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">Emploi du temps</h1>
          <p className="text-sm text-[#86868b] mt-1">Rendez-vous en atelier (réparations locales)</p>
        </div>
        <Link href="/admin/repairs/new">
          <Button variant="primary" size="sm">
            <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau RDV
          </Button>
        </Link>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={prevWeek}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <svg className="h-4 w-4 text-[#424245]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 text-center">
          <span className="text-sm font-medium text-[#1d1d1f]">{weekLabel}</span>
          {totalWeek > 0 && (
            <span className="ml-2 text-xs text-[#86868b]">({totalWeek} RDV)</span>
          )}
        </div>
        <button
          onClick={nextWeek}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <svg className="h-4 w-4 text-[#424245]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {!isCurrentWeek && (
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-sm font-medium text-[#0071e3] border border-[#0071e3] rounded-lg hover:bg-blue-50 transition-colors"
          >
            Aujourd&apos;hui
          </button>
        )}
      </div>

      {/* Week grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {weekDays.map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const today = new Date();
            const isToday = isSameDay(day, today);
            const isPast = day < today && !isToday;
            const dayAppointments = appointments.filter((a) =>
              isSameDay(new Date(a.appointmentDate), day)
            );

            return (
              <div
                key={day.toISOString()}
                className={`rounded-xl border p-3 min-h-[120px] ${
                  isToday
                    ? "border-[#0071e3] bg-blue-50/40"
                    : isPast
                    ? "border-gray-100 bg-gray-50/50"
                    : "border-gray-200 bg-white"
                }`}
              >
                {/* Day header */}
                <div className="mb-2">
                  <p
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      isToday ? "text-[#0071e3]" : isPast ? "text-[#86868b]" : "text-[#424245]"
                    }`}
                  >
                    {formatWeekday(day)}
                  </p>
                  {isToday && (
                    <span className="inline-block mt-0.5 text-[10px] font-medium bg-[#0071e3] text-white px-1.5 py-0.5 rounded-full">
                      Aujourd&apos;hui
                    </span>
                  )}
                </div>

                {/* Appointments */}
                <div className="space-y-2">
                  {dayAppointments.length === 0 ? (
                    <p className="text-xs text-[#c7c7cc]">Aucun RDV</p>
                  ) : (
                    dayAppointments.map((appt) => {
                      const time = new Date(appt.appointmentDate).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const priorityBorder = PRIORITY_COLORS[appt.priority] || "border-l-gray-300";
                      const priorityLabel = PRIORITIES.find((p) => p.key === appt.priority)?.label;
                      return (
                        <Link key={appt.id} href={`/admin/repairs/${appt.id}`}>
                          <div
                            className={`p-2 rounded-lg bg-white border border-gray-100 border-l-4 ${priorityBorder} hover:shadow-sm transition-shadow cursor-pointer`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-xs font-bold text-[#0071e3]">{time}</span>
                              <StatusBadge status={appt.status} repairType="LOCAL" />
                            </div>
                            <p className="text-xs font-semibold text-[#1d1d1f] truncate">
                              {appt.clientFirstName} {appt.clientLastName}
                            </p>
                            <p className="text-[11px] text-[#86868b] truncate">{appt.macModel}</p>
                            <p className="text-[11px] text-[#86868b] truncate">{appt.faultType}</p>
                            {appt.technician && (
                              <p className="text-[11px] text-[#86868b] mt-1 truncate">
                                👤 {appt.technician.firstName}
                              </p>
                            )}
                            {priorityLabel && appt.priority !== "NORMAL" && (
                              <p className={`text-[10px] font-medium mt-0.5 ${
                                appt.priority === "URGENT" ? "text-red-600" :
                                appt.priority === "HIGH" ? "text-orange-600" : "text-gray-500"
                              }`}>
                                ⚡ {priorityLabel}
                              </p>
                            )}
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty week message */}
      {!loading && totalWeek === 0 && (
        <Card className="mt-4">
          <div className="text-center py-8">
            <span className="text-4xl">📅</span>
            <p className="text-[#1d1d1f] font-medium mt-3">Aucun rendez-vous cette semaine</p>
            <p className="text-sm text-[#86868b] mt-1">
              Planifiez un RDV lors de la création d&apos;une réparation locale.
            </p>
            <div className="mt-4">
              <Link href="/admin/repairs/new">
                <Button variant="primary" size="sm">Nouvelle réparation</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
