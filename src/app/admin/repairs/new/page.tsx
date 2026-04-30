"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { MAC_MODELS, FAULT_TYPES, PRIORITIES, CARRIERS } from "@/lib/constants";

interface User {
  id: string;
  firstName: string;
  lastName: string;
}

const macModelOptions = MAC_MODELS.map((m) => ({ value: m, label: m }));
const faultTypeOptions = FAULT_TYPES.map((f) => ({ value: f, label: f }));
const priorityOptions = PRIORITIES.map((p) => ({ value: p.key, label: p.label }));
const carrierOptions = CARRIERS.map((c) => ({ value: c, label: c }));

export default function NewRepairPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [technicians, setTechnicians] = useState<User[]>([]);

  // Client info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Mac info
  const [macModel, setMacModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [faultType, setFaultType] = useState("");
  const [faultDescription, setFaultDescription] = useState("");

  // Repair info
  const [repairType, setRepairType] = useState<"POSTAL" | "LOCAL">("LOCAL");
  const [priority, setPriority] = useState("NORMAL");
  const [inboundTracking, setInboundTracking] = useState("");
  const [carrier, setCarrier] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [estimatedReturn, setEstimatedReturn] = useState("");
  const [technicianId, setTechnicianId] = useState("");

  // Appointment (LOCAL only)
  const [appointmentDate, setAppointmentDate] = useState("");

  // Notes
  const [internalNote, setInternalNote] = useState("");

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/users")
      .then((res) => {
        if (res.ok) return res.json();
        return [];
      })
      .then((data) => {
        if (Array.isArray(data)) setTechnicians(data.filter((u: User & { active?: boolean }) => (u as User & { active?: boolean }).active !== false));
      })
      .catch(() => {});
  }, []);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = "Le prenom est requis";
    if (!lastName.trim()) errs.lastName = "Le nom est requis";
    if (!email.trim()) errs.email = "L'email est requis";
    if (!phone.trim()) errs.phone = "Le telephone est requis";
    if (!macModel) errs.macModel = "Le modele est requis";
    if (!faultType) errs.faultType = "Le type de panne est requis";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        clientFirstName: firstName.trim(),
        clientLastName: lastName.trim(),
        clientEmail: email.trim(),
        clientPhone: phone.trim(),
        clientAddress: address.trim(),
        clientCity: city.trim(),
        clientPostalCode: postalCode.trim(),
        macModel,
        serialNumber: serialNumber.trim(),
        faultType,
        faultDescription: faultDescription.trim(),
        repairType,
        priority,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : 0,
        estimatedReturn: estimatedReturn || null,
        appointmentDate: appointmentDate || null,
        technicianId: technicianId || null,
      };

      if (repairType === "POSTAL") {
        body.inboundTracking = inboundTracking.trim();
        body.carrier = carrier;
      }

      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur lors de la creation");
        return;
      }

      // Add internal note if provided
      if (internalNote.trim() && data.id) {
        await fetch(`/api/repairs/${data.id}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: internalNote.trim(),
            isInternal: true,
          }),
        });
      }

      toast.success("Reparation creee avec succes");
      router.push(`/admin/repairs/${data.id}`);
    } catch {
      toast.error("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  const technicianOptions = [
    { value: "", label: "Non assigne" },
    ...technicians.map((t) => ({
      value: t.id,
      label: `${t.firstName} ${t.lastName}`,
    })),
  ];

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/repairs"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="h-5 w-5 text-[#86868b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">
            Nouvelle reparation
          </h1>
          <p className="text-sm text-[#86868b] mt-1">
            Creer un nouveau dossier de reparation
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client info */}
        <Card>
          <CardHeader>
            <CardTitle>Informations client</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Prenom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={errors.firstName}
              required
            />
            <Input
              label="Nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              error={errors.lastName}
              required
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              required
            />
            <Input
              label="Telephone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={errors.phone}
              required
            />
            <Input
              label="Adresse"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <Input
              label="Ville"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Input
              label="Code postal"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
          </div>
        </Card>

        {/* Mac info */}
        <Card>
          <CardHeader>
            <CardTitle>Informations Mac</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Modele"
              options={macModelOptions}
              value={macModel}
              onChange={(e) => setMacModel(e.target.value)}
              placeholder="Selectionnez un modele"
              error={errors.macModel}
              required
            />
            <Input
              label="Numero de serie"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="Ex: C02X..."
            />
            <Select
              label="Type de panne"
              options={faultTypeOptions}
              value={faultType}
              onChange={(e) => setFaultType(e.target.value)}
              placeholder="Selectionnez une panne"
              error={errors.faultType}
              required
            />
          </div>
          <div className="mt-4">
            <Textarea
              label="Description de la panne"
              value={faultDescription}
              onChange={(e) => setFaultDescription(e.target.value)}
              rows={3}
              placeholder="Details supplementaires sur la panne..."
            />
          </div>
        </Card>

        {/* Repair info */}
        <Card>
          <CardHeader>
            <CardTitle>Informations reparation</CardTitle>
          </CardHeader>

          {/* Repair type radio */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Type de reparation <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label
                className={`
                  flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                  ${repairType === "LOCAL" ? "border-[#0071e3] bg-blue-50/50" : "border-gray-200 hover:border-gray-300"}
                `}
              >
                <input
                  type="radio"
                  name="repairType"
                  value="LOCAL"
                  checked={repairType === "LOCAL"}
                  onChange={() => setRepairType("LOCAL")}
                  className="sr-only"
                />
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                  repairType === "LOCAL" ? "border-[#0071e3]" : "border-gray-300"
                }`}>
                  {repairType === "LOCAL" && (
                    <div className="h-2.5 w-2.5 rounded-full bg-[#0071e3]" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm text-[#1d1d1f]">Atelier (Local)</p>
                  <p className="text-xs text-[#86868b]">Le client depose son Mac en atelier</p>
                </div>
              </label>
              <label
                className={`
                  flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                  ${repairType === "POSTAL" ? "border-[#0071e3] bg-blue-50/50" : "border-gray-200 hover:border-gray-300"}
                `}
              >
                <input
                  type="radio"
                  name="repairType"
                  value="POSTAL"
                  checked={repairType === "POSTAL"}
                  onChange={() => setRepairType("POSTAL")}
                  className="sr-only"
                />
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                  repairType === "POSTAL" ? "border-[#0071e3]" : "border-gray-300"
                }`}>
                  {repairType === "POSTAL" && (
                    <div className="h-2.5 w-2.5 rounded-full bg-[#0071e3]" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm text-[#1d1d1f]">Postal</p>
                  <p className="text-xs text-[#86868b]">Le client envoie son Mac par colis</p>
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Priorite"
              options={priorityOptions}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            />
            <Select
              label="Technicien"
              options={technicianOptions}
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
            />

            {repairType === "POSTAL" && (
              <>
                <Input
                  label="N de suivi entrant"
                  value={inboundTracking}
                  onChange={(e) => setInboundTracking(e.target.value)}
                  placeholder="Numero de suivi du colis"
                />
                <Select
                  label="Transporteur"
                  options={carrierOptions}
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="Selectionnez un transporteur"
                />
              </>
            )}

            <Input
              label="Cout estime (EUR)"
              type="number"
              step="0.01"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              placeholder="0.00"
            />
            <Input
              label="Date de retour estimee"
              type="date"
              value={estimatedReturn}
              onChange={(e) => setEstimatedReturn(e.target.value)}
            />
            {repairType === "LOCAL" && (
              <Input
                label="Date et heure du rendez-vous"
                type="datetime-local"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
              />
            )}
          </div>
        </Card>

        {/* Internal note */}
        <Card>
          <CardHeader>
            <CardTitle>Note interne</CardTitle>
          </CardHeader>
          <Textarea
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            rows={3}
            placeholder="Note visible uniquement par l'equipe..."
          />
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" variant="primary" size="lg" loading={loading}>
            Creer la reparation
          </Button>
          <Link href="/admin/repairs">
            <Button type="button" variant="ghost" size="lg">Annuler</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
