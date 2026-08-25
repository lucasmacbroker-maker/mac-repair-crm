"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { PageLoader } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/Toast";
import {
  getStatuses,
  getStatusLabel,
  MAC_MODELS,
  FAULT_TYPES,
  PRIORITIES,
  CARRIERS,
} from "@/lib/constants";

function toLocalDatetimeInput(dateStr: string) {
  const d = new Date(dateStr);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Note {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string };
}

interface StatusChange {
  id: string;
  fromStatus: string;
  toStatus: string;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string };
}

interface RepairPart {
  id: string;
  quantity: number;
  unitPrice: number;
  createdAt: string;
  part: {
    id: string;
    name: string;
    sku: string;
    category: string;
  };
}

interface Attachment {
  id: string;
  fileName: string;
  storedName: string;
  mimeType: string;
  size: number;
  type: string;
  createdAt: string;
}

interface Repair {
  id: string;
  token: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  clientCity: string;
  clientPostalCode: string;
  macModel: string;
  serialNumber: string;
  faultType: string;
  faultDescription: string;
  repairType: string;
  status: string;
  priority: string;
  inboundTracking: string;
  outboundTracking: string;
  carrier: string;
  trackingLink: string;
  paymentLink: string;
  estimatedCost: number;
  finalCost: number;
  estimatedReturn: string | null;
  appointmentDate: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  quoteValidated: boolean;
  quoteValidatedAt: string | null;
  technicianId: string | null;
  technician: Technician | null;
  notes: Note[];
  statusChanges: StatusChange[];
  partsUsed: RepairPart[];
  attachments: Attachment[];
}

interface StockPart {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  sellPrice: number;
}

export default function RepairDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const repairId = params.id as string;

  const [repair, setRepair] = useState<Repair | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

  // Notes
  const [noteContent, setNoteContent] = useState("");
  const [noteIsInternal, setNoteIsInternal] = useState(true);
  const [addingNote, setAddingNote] = useState(false);

  // Parts modal
  const [showPartModal, setShowPartModal] = useState(false);
  const [stockParts, setStockParts] = useState<StockPart[]>([]);
  const [selectedPartId, setSelectedPartId] = useState("");
  const [partQuantity, setPartQuantity] = useState("1");
  const [addingPart, setAddingPart] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<Record<string, string | number | null>>({});
  const [saving, setSaving] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  // Appointment
  const [sendingConfirmation, setSendingConfirmation] = useState(false);

  // Send documents (devis + bordereau)
  const [sendingDocuments, setSendingDocuments] = useState(false);
  const [bordereauFile, setBordereauFile] = useState<File | null>(null);

  // Packlink modal (inbound label)
  const [showPacklinkModal, setShowPacklinkModal] = useState(false);
  const [packlinkService, setPacklinkService] = useState("ACI_CHRONOPOST_18_S2H");
  const [packlinkWeight, setPacklinkWeight] = useState("2");
  const [packlinkContentValue, setPacklinkContentValue] = useState("500");
  const [creatingShipment, setCreatingShipment] = useState(false);
  const [shipmentRef, setShipmentRef] = useState<string | null>(null);
  const [labelLoading, setLabelLoading] = useState(false);

  // Return shipment
  const [sendingReturn, setSendingReturn] = useState(false);
  const [returnBordereauFile, setReturnBordereauFile] = useState<File | null>(null);
  const [returnTrackingUrl, setReturnTrackingUrl] = useState("");
  const [returnTrackingNumber, setReturnTrackingNumber] = useState("");
  const [returnExtractingTracking, setReturnExtractingTracking] = useState(false);
  const [returnTrackingAutoFilled, setReturnTrackingAutoFilled] = useState(false);

  // Attachments
  const [uploading, setUploading] = useState(false);
  const [attachmentType, setAttachmentType] = useState("Photo");

  const fetchRepair = useCallback(async () => {
    try {
      const res = await fetch(`/api/repairs/${repairId}`);
      if (!res.ok) {
        toast.error("Reparation introuvable");
        router.push("/admin/repairs");
        return;
      }
      const data = await res.json();
      setRepair(data);
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repairId]);

  useEffect(() => {
    fetchRepair();
  }, [fetchRepair]);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => { if (Array.isArray(data)) setTechnicians(data); })
      .catch(() => {});
  }, []);

  // Status change (direct jump to any status)
  const handleSetStatus = async (newStatus: string) => {
    if (!repair || repair.status === newStatus) return;
    setStatusLoading(true);

    try {
      const res = await fetch(`/api/repairs/${repairId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Erreur");
        return;
      }

      toast.success("Statut mis a jour");
      fetchRepair();
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setStatusLoading(false);
    }
  };

  // Add note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    setAddingNote(true);
    try {
      const res = await fetch(`/api/repairs/${repairId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent.trim(), isInternal: noteIsInternal }),
      });

      if (!res.ok) {
        toast.error("Erreur lors de l'ajout de la note");
        return;
      }

      toast.success("Note ajoutee");
      setNoteContent("");
      fetchRepair();
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setAddingNote(false);
    }
  };

  // Add part
  const handleOpenPartModal = async () => {
    setShowPartModal(true);
    try {
      const res = await fetch("/api/stock");
      const data = await res.json();
      setStockParts(Array.isArray(data) ? data.filter((p: StockPart) => p.quantity > 0) : []);
    } catch {
      toast.error("Erreur lors du chargement des pieces");
    }
  };

  const handleAddPart = async () => {
    if (!selectedPartId || !partQuantity) return;
    setAddingPart(true);

    const selectedPart = stockParts.find((p) => p.id === selectedPartId);

    try {
      const res = await fetch(`/api/repairs/${repairId}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId: selectedPartId,
          quantity: parseInt(partQuantity),
          unitPrice: selectedPart?.sellPrice || 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Erreur");
        return;
      }

      toast.success("Piece ajoutee");
      setShowPartModal(false);
      setSelectedPartId("");
      setPartQuantity("1");
      fetchRepair();
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setAddingPart(false);
    }
  };

  const handleSendAppointmentConfirmation = async () => {
    setSendingConfirmation(true);
    try {
      const res = await fetch(`/api/repairs/${repairId}/appointment`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de l'envoi");
        return;
      }
      toast.success("Email de confirmation envoyé !");
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setSendingConfirmation(false);
    }
  };

  // Edit repair
  const handleOpenEditModal = () => {
    if (!repair) return;
    setEditData({
      clientFirstName: repair.clientFirstName,
      clientLastName: repair.clientLastName,
      clientEmail: repair.clientEmail,
      clientPhone: repair.clientPhone,
      clientAddress: repair.clientAddress,
      clientCity: repair.clientCity,
      clientPostalCode: repair.clientPostalCode,
      macModel: repair.macModel,
      serialNumber: repair.serialNumber,
      faultType: repair.faultType,
      faultDescription: repair.faultDescription,
      priority: repair.priority,
      inboundTracking: repair.inboundTracking,
      outboundTracking: repair.outboundTracking,
      carrier: repair.carrier,
      trackingLink: repair.trackingLink,
      paymentLink: repair.paymentLink,
      estimatedCost: repair.estimatedCost,
      finalCost: repair.finalCost,
      technicianId: repair.technicianId,
      appointmentDate: repair.appointmentDate
        ? toLocalDatetimeInput(repair.appointmentDate)
        : "",
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/repairs/${repairId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        ...editData,
        appointmentDate: editData.appointmentDate
          ? new Date(editData.appointmentDate).toISOString()
          : null,
      }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Erreur");
        return;
      }

      toast.success("Reparation mise a jour");
      setShowEditModal(false);
      fetchRepair();
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", attachmentType);

      const res = await fetch(`/api/repairs/${repairId}/attachments`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let errMsg = `Erreur ${res.status}`;
        try { const d = await res.json(); errMsg = d.error || errMsg; } catch { errMsg += " (réponse non-JSON)"; }
        toast.error(errMsg);
        return;
      }

      toast.success("Document ajoute");
      fetchRepair();
    } catch (err) {
      toast.error("Erreur: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const res = await fetch(`/api/repairs/${repairId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Erreur lors de la suppression");
        return;
      }
      toast.success("Document supprime");
      fetchRepair();
    } catch {
      toast.error("Erreur de connexion");
    }
  };

  const handleCreateShipment = async () => {
    if (!repair) return;
    setCreatingShipment(true);
    setShipmentRef(null);
    try {
      const res = await fetch("/api/packlink/shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: repair.clientFirstName,
          clientSurname: repair.clientLastName,
          clientPhone: repair.clientPhone,
          clientEmail: repair.clientEmail,
          clientStreet: repair.clientAddress,
          clientCity: repair.clientCity,
          clientZip: repair.clientPostalCode,
          weight: parseFloat(packlinkWeight) || 2,
          contentValue: parseFloat(packlinkContentValue) || 500,
          serviceId: packlinkService,
          direction: "inbound",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = (data as { error?: string }).error || "Erreur lors de la création du bordereau";
        toast.error(errMsg);
        console.error("Packlink error:", data);
        return;
      }
      const ref = (data.id || data.reference || data.shipment_id) as string | undefined;
      if (ref) {
        setShipmentRef(ref);
        toast.success("Bordereau créé ! Téléchargez l'étiquette.");
      } else {
        toast.error("Réponse Packlink inattendue — vérifiez votre tableau de bord Packlink");
        console.error("Packlink response:", data);
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setCreatingShipment(false);
    }
  };

  const handleDownloadLabel = async () => {
    if (!shipmentRef) return;
    setLabelLoading(true);
    try {
      const res = await fetch(`/api/packlink/shipment?ref=${encodeURIComponent(shipmentRef)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if ((data as { pending?: boolean }).pending) {
          toast.error("L'étiquette n'est pas encore prête — réessayez dans quelques secondes");
        } else {
          toast.error("Impossible de télécharger l'étiquette");
        }
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bordereau-${shipmentRef}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erreur de téléchargement");
    } finally {
      setLabelLoading(false);
    }
  };

  const handleSendDocuments = async () => {
    if (!bordereauFile) {
      toast.error("Veuillez sélectionner le bordereau Packlink (PDF)");
      return;
    }
    setSendingDocuments(true);
    try {
      const fd = new FormData();
      fd.append("bordereau", bordereauFile);
      const res = await fetch(`/api/repairs/${repairId}/send-documents`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error();
      toast.success("Devis + bordereau envoyés au client ✓");
      setBordereauFile(null);
      const input = document.getElementById("bordereau-input") as HTMLInputElement;
      if (input) input.value = "";
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSendingDocuments(false);
    }
  };

  const handleReturnBordereauChange = async (file: File | null) => {
    setReturnBordereauFile(file);
    setReturnTrackingAutoFilled(false);
    setReturnTrackingNumber("");
    if (!file) return;
    setReturnExtractingTracking(true);
    try {
      const fd = new FormData();
      fd.append("pdf", file);
      const res = await fetch("/api/extract-tracking", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        if (data.tracking) {
          setReturnTrackingNumber(data.tracking);
          // Auto-generate Chronopost tracking URL from the number
          const url = `https://www.chronopost.fr/tracking-no-powerful/tracking/suivi?listeNumerosLT=${encodeURIComponent(data.tracking)}`;
          setReturnTrackingUrl(url);
          setReturnTrackingAutoFilled(true);
        }
      }
    } catch { /* ignore, user can fill manually */ }
    finally {
      setReturnExtractingTracking(false);
    }
  };

  const handleSendReturn = async () => {
    if (!returnBordereauFile) {
      toast.error("Veuillez sélectionner le bordereau retour (PDF)");
      return;
    }
    if (!returnTrackingUrl.trim()) {
      toast.error("Veuillez saisir le lien de suivi Packlink");
      return;
    }
    setSendingReturn(true);
    try {
      const fd = new FormData();
      fd.append("bordereau", returnBordereauFile);
      fd.append("trackingUrl", returnTrackingUrl.trim());
      if (returnTrackingNumber.trim()) fd.append("trackingNumber", returnTrackingNumber.trim());
      const res = await fetch(`/api/repairs/${repairId}/send-return`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error();
      toast.success("Bordereau retour envoyé — lien de suivi mis à jour ✓");
      setReturnBordereauFile(null);
      setReturnTrackingUrl("");
      setReturnTrackingNumber("");
      setReturnTrackingAutoFilled(false);
      const input = document.getElementById("return-bordereau-input") as HTMLInputElement;
      if (input) input.value = "";
      fetchRepair();
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSendingReturn(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!repair) return null;

  const statuses = getStatuses(repair.repairType);
  const currentStatusIndex = statuses.findIndex((s) => s.key === repair.status);
  const isLastStatus = currentStatusIndex >= statuses.length - 1;

  const totalPartsCost = repair.partsUsed.reduce(
    (sum, p) => sum + p.unitPrice * p.quantity,
    0
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          <Link
            href="/admin/repairs"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 mt-0.5"
          >
            <svg className="h-5 w-5 text-[#86868b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-lg sm:text-2xl font-semibold text-[#1d1d1f] tracking-tight">
                {repair.clientFirstName} {repair.clientLastName}
              </h1>
              <StatusBadge status={repair.status} repairType={repair.repairType} />
            </div>
            <p className="text-xs sm:text-sm text-[#86868b] mt-1 truncate">
              {repair.macModel} &middot; {repair.faultType} &middot;{" "}
              <span className="font-mono">{repair.id.slice(0, 8)}</span>
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={handleOpenEditModal} className="flex-shrink-0 self-start">
          <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Modifier
        </Button>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Client details */}
        <Card>
          <CardHeader>
            <CardTitle>Client</CardTitle>
          </CardHeader>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#86868b]">Nom</span>
              <span className="text-[#1d1d1f] font-medium">{repair.clientFirstName} {repair.clientLastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#86868b]">Email</span>
              <a href={`mailto:${repair.clientEmail}`} className="text-[#0071e3]">{repair.clientEmail}</a>
            </div>
            <div className="flex justify-between">
              <span className="text-[#86868b]">Telephone</span>
              <span className="text-[#1d1d1f]">{repair.clientPhone}</span>
            </div>
            {repair.clientAddress && (
              <div className="flex justify-between">
                <span className="text-[#86868b]">Adresse</span>
                <span className="text-[#1d1d1f] text-right">
                  {repair.clientAddress}{repair.clientCity ? `, ${repair.clientCity}` : ""}{repair.clientPostalCode ? ` ${repair.clientPostalCode}` : ""}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Mac details */}
        <Card>
          <CardHeader>
            <CardTitle>Mac</CardTitle>
          </CardHeader>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#86868b]">Modele</span>
              <span className="text-[#1d1d1f] font-medium">{repair.macModel}</span>
            </div>
            {repair.serialNumber && (
              <div className="flex justify-between">
                <span className="text-[#86868b]">N/S</span>
                <span className="text-[#1d1d1f] font-mono">{repair.serialNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#86868b]">Panne</span>
              <span className="text-[#1d1d1f]">{repair.faultType}</span>
            </div>
            {repair.faultDescription && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[#86868b] mb-1">Description</p>
                <p className="text-[#1d1d1f]">{repair.faultDescription}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Tracking info */}
        <Card>
          <CardHeader>
            <CardTitle>Suivi</CardTitle>
          </CardHeader>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#86868b]">Type</span>
              <Badge variant={repair.repairType === "POSTAL" ? "purple" : repair.repairType === "HOME" ? "warning" : "info"}>
                {repair.repairType === "POSTAL" ? "Postal" : repair.repairType === "HOME" ? "À domicile" : "Atelier"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-[#86868b]">Priorite</span>
              <span className="text-[#1d1d1f]">
                {PRIORITIES.find((p) => p.key === repair.priority)?.label || repair.priority}
              </span>
            </div>
            {repair.technician && (
              <div className="flex justify-between">
                <span className="text-[#86868b]">Technicien</span>
                <span className="text-[#1d1d1f]">{repair.technician.firstName} {repair.technician.lastName}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-[#86868b]">Lien de suivi</span>
              <div className="flex items-center gap-2">
                <span className="text-[#1d1d1f] font-mono text-xs">{repair.token.slice(0, 12)}...</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = `${window.location.origin}/suivi/${repair.token}`;
                    const textarea = document.createElement("textarea");
                    textarea.value = url;
                    textarea.style.position = "fixed";
                    textarea.style.opacity = "0";
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand("copy");
                    document.body.removeChild(textarea);
                    toast.success("Lien de suivi copie !");
                  }}
                  className="text-[#0071e3] hover:text-[#0077ed] text-xs font-medium"
                >
                  Copier le lien
                </button>
              </div>
            </div>
            {repair.carrier && (
              <div className="flex justify-between">
                <span className="text-[#86868b]">Transporteur</span>
                <span className="text-[#1d1d1f]">{repair.carrier}</span>
              </div>
            )}
            {repair.inboundTracking && (
              <div className="flex justify-between">
                <span className="text-[#86868b]">Suivi entrant</span>
                <span className="text-[#1d1d1f] font-mono text-xs">{repair.inboundTracking}</span>
              </div>
            )}
            {repair.outboundTracking && (
              <div className="flex justify-between">
                <span className="text-[#86868b]">Suivi sortant</span>
                <span className="text-[#1d1d1f] font-mono text-xs">{repair.outboundTracking}</span>
              </div>
            )}
            {repair.trackingLink && (
              <div className="flex justify-between">
                <span className="text-[#86868b]">Suivi Chronopost</span>
                <a href={repair.trackingLink} target="_blank" rel="noopener noreferrer" className="text-[#0071e3] hover:text-[#0077ed] text-sm font-medium transition-colors">
                  Suivre le colis &rarr;
                </a>
              </div>
            )}
            {repair.repairType === "POSTAL" && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-[#86868b] mb-2">Adresse de livraison Mac Place :</p>
                <p className="text-xs text-[#424245] font-mono mb-3">5, rue Paul Vaillant Couturier<br/>94700 Maisons Alfort</p>
                <button
                  type="button"
                  onClick={() => { setShipmentRef(null); setShowPacklinkModal(true); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: "#e8611a" }}
                >
                  📦 Créer bordereau Chronopost
                </button>
              </div>
            )}
            {repair.paymentLink && (
              <div className="flex justify-between">
                <span className="text-[#86868b]">Lien de paiement</span>
                <a href={repair.paymentLink} target="_blank" rel="noopener noreferrer" className="text-[#0071e3] hover:text-[#0077ed] text-sm font-medium transition-colors">
                  Payer &rarr;
                </a>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#86868b]">Cree le</span>
              <span className="text-[#1d1d1f]">{new Date(repair.createdAt).toLocaleDateString("fr-FR")}</span>
            </div>
            {repair.estimatedReturn && (
              <div className="flex justify-between">
                <span className="text-[#86868b]">Retour estime</span>
                <span className="text-[#1d1d1f]">{new Date(repair.estimatedReturn).toLocaleDateString("fr-FR")}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Financial info */}
        <Card>
          <CardHeader>
            <CardTitle>Financier</CardTitle>
          </CardHeader>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#86868b]">Cout estime</span>
              <span className="text-[#1d1d1f] font-medium">
                {repair.estimatedCost.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#86868b]">Cout final</span>
              <span className="text-[#1d1d1f] font-medium">
                {repair.finalCost.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#86868b]">Cout pieces</span>
              <span className="text-[#1d1d1f] font-medium">
                {totalPartsCost.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="text-[#86868b]">Devis</span>
              {repair.quoteValidated ? (
                <Badge variant="success">
                  Valide le {new Date(repair.quoteValidatedAt!).toLocaleDateString("fr-FR")}
                </Badge>
              ) : (
                <Badge variant="neutral">Non valide</Badge>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Send documents card — POSTAL repairs only */}
      {repair.repairType === "POSTAL" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>📨 Envoyer devis + bordereau au client</CardTitle>
          </CardHeader>
          <div className="px-6 pb-6">
            <p className="text-sm text-[#86868b] mb-4">
              Téléchargez le bordereau depuis Packlink, puis sélectionnez-le ici. Le client recevra un email avec le devis PDF et le bordereau d&apos;envoi en pièce jointe.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-[#86868b] mb-1.5">Bordereau Packlink (PDF)</label>
                <input
                  id="bordereau-input"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setBordereauFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-[#424245] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#f5f5f7] file:text-[#1d1d1f] hover:file:bg-[#e8e8ed] cursor-pointer border border-gray-200 rounded-lg p-1.5"
                />
              </div>
              <Button
                onClick={handleSendDocuments}
                loading={sendingDocuments}
                disabled={!bordereauFile || sendingDocuments}
                className="whitespace-nowrap"
              >
                <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Envoyer au client
              </Button>
            </div>
            {bordereauFile && (
              <p className="text-xs text-green-600 mt-2">✓ {bordereauFile.name} sélectionné</p>
            )}
          </div>
        </Card>
      )}

      {/* Return shipment card — POSTAL repairs, when DONE or later */}
      {repair.repairType === "POSTAL" && ["DONE", "RESHIPPED", "CLOSED"].includes(repair.status) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>📦 Expédition retour client</CardTitle>
          </CardHeader>
          <div className="px-6 pb-6">
            <p className="text-sm text-[#86868b] mb-4">
              Une fois le paiement reçu, téléchargez le bordereau retour depuis Packlink et collez le lien de suivi. Le client recevra un email avec le bordereau et le lien, et sa page de suivi sera mise à jour automatiquement.
            </p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1.5">Bordereau retour Packlink (PDF)</label>
                <input
                  id="return-bordereau-input"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => handleReturnBordereauChange(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-[#424245] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#f5f5f7] file:text-[#1d1d1f] hover:file:bg-[#e8e8ed] cursor-pointer border border-gray-200 rounded-lg p-1.5"
                />
                {returnExtractingTracking && (
                  <p className="text-xs text-[#86868b] mt-1">🔍 Extraction du numéro de suivi...</p>
                )}
                {returnBordereauFile && !returnExtractingTracking && (
                  <p className="text-xs text-green-600 mt-1">✓ {returnBordereauFile.name}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1.5">
                  Numéro de suivi
                  {returnTrackingAutoFilled && (
                    <span className="ml-2 text-green-600 font-normal">✓ extrait automatiquement</span>
                  )}
                </label>
                <input
                  type="text"
                  value={returnTrackingNumber}
                  onChange={(e) => {
                    setReturnTrackingNumber(e.target.value);
                    setReturnTrackingAutoFilled(false);
                    if (e.target.value.trim()) {
                      setReturnTrackingUrl(`https://www.chronopost.fr/tracking-no-powerful/tracking/suivi?listeNumerosLT=${encodeURIComponent(e.target.value.trim())}`);
                    }
                  }}
                  placeholder="ex. XS474454248FR"
                  className="block w-full font-mono text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1.5">
                  Lien de suivi
                  {returnTrackingAutoFilled && (
                    <span className="ml-2 text-green-600 font-normal">✓ généré automatiquement</span>
                  )}
                </label>
                <input
                  type="url"
                  value={returnTrackingUrl}
                  onChange={(e) => { setReturnTrackingUrl(e.target.value); setReturnTrackingAutoFilled(false); }}
                  placeholder="https://www.chronopost.fr/tracking-no-powerful/tracking/suivi?..."
                  className="block w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleSendReturn}
                  loading={sendingReturn}
                  disabled={!returnBordereauFile || !returnTrackingUrl.trim() || sendingReturn}
                >
                  <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Envoyer au client
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Appointment card — LOCAL repairs only */}
      {repair.repairType === "LOCAL" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Rendez-vous</CardTitle>
            {repair.appointmentDate && (
              <Button
                variant="secondary"
                size="sm"
                loading={sendingConfirmation}
                onClick={handleSendAppointmentConfirmation}
              >
                <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Renvoyer la confirmation
              </Button>
            )}
          </CardHeader>
          {repair.appointmentDate ? (
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">📅</span>
              </div>
              <div>
                <p className="text-base font-semibold text-[#1d1d1f] capitalize">
                  {new Date(repair.appointmentDate).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-lg font-bold text-[#0071e3]">
                  {new Date(repair.appointmentDate).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#86868b]">Aucun rendez-vous planifié.</p>
              <Button variant="secondary" size="sm" onClick={handleOpenEditModal}>
                Planifier un RDV
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Status timeline */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Progression du statut</CardTitle>
          {!isLastStatus && (
            <select
              disabled={statusLoading}
              value=""
              onChange={(e) => { if (e.target.value) handleSetStatus(e.target.value); }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-50"
            >
              <option value="" disabled>Changer le statut...</option>
              {statuses.filter((_, idx) => idx > currentStatusIndex).map((s) => (
                <option key={s.key} value={s.key}>{s.icon} {s.label}</option>
              ))}
            </select>
          )}
        </CardHeader>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {statuses.map((s, idx) => {
            const isPast = idx < currentStatusIndex;
            const isCurrent = idx === currentStatusIndex;
            return (
              <React.Fragment key={s.key}>
                {idx > 0 && (
                  <div className={`h-0.5 w-8 flex-shrink-0 rounded ${
                    isPast || isCurrent ? "bg-[#0071e3]" : "bg-gray-200"
                  }`} />
                )}
                <div
                  onClick={() => { if (!isCurrent && !statusLoading) handleSetStatus(s.key); }}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg flex-shrink-0 text-sm transition-all
                    ${isCurrent ? "bg-[#0071e3] text-white font-medium" : ""}
                    ${isPast ? "bg-green-50 text-green-700 cursor-pointer hover:bg-green-100" : ""}
                    ${!isPast && !isCurrent ? "bg-gray-50 text-[#86868b] cursor-pointer hover:bg-gray-100" : ""}
                  `}
                >
                  {isPast && (
                    <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <span className="text-base">{s.icon}</span>
                  <span className="whitespace-nowrap">{s.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notes section */}
        <Card>
          <CardHeader>
            <CardTitle>Notes ({repair.notes.length})</CardTitle>
          </CardHeader>

          {/* Add note form */}
          <form onSubmit={handleAddNote} className="mb-4 pb-4 border-b border-gray-100">
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={2}
              placeholder="Ajouter une note..."
            />
            <div className="flex items-center justify-between mt-3">
              <label className="flex items-center gap-2 text-sm text-[#424245]">
                <input
                  type="checkbox"
                  checked={noteIsInternal}
                  onChange={(e) => setNoteIsInternal(e.target.checked)}
                  className="rounded border-gray-300 text-[#0071e3] focus:ring-[#0071e3]"
                />
                Note interne
              </label>
              <Button type="submit" variant="primary" size="sm" loading={addingNote}>
                Ajouter
              </Button>
            </div>
          </form>

          {/* Notes list */}
          {repair.notes.length === 0 ? (
            <p className="text-sm text-[#86868b] text-center py-4">
              Aucune note pour le moment.
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {repair.notes.map((note) => (
                <div
                  key={note.id}
                  className={`p-3 rounded-lg text-sm ${
                    note.isInternal ? "bg-amber-50 border border-amber-100" : "bg-gray-50 border border-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-[#1d1d1f]">
                      {note.user ? `${note.user.firstName} ${note.user.lastName}` : "Systeme"}
                    </span>
                    <div className="flex items-center gap-2">
                      {note.isInternal && (
                        <Badge variant="warning">Interne</Badge>
                      )}
                      <span className="text-xs text-[#86868b]">
                        {new Date(note.createdAt).toLocaleString("fr-FR")}
                      </span>
                    </div>
                  </div>
                  <p className="text-[#424245]">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Parts section */}
        <Card>
          <CardHeader>
            <CardTitle>Pieces utilisees ({repair.partsUsed.length})</CardTitle>
            <Button variant="secondary" size="sm" onClick={handleOpenPartModal}>
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter
            </Button>
          </CardHeader>

          {repair.partsUsed.length === 0 ? (
            <p className="text-sm text-[#86868b] text-center py-4">
              Aucune piece ajoutee.
            </p>
          ) : (
            <div className="space-y-2">
              {repair.partsUsed.map((rp) => (
                <div
                  key={rp.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f]">{rp.part.name}</p>
                    <p className="text-xs text-[#86868b]">{rp.part.sku} &middot; {rp.part.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#1d1d1f]">
                      {(rp.unitPrice * rp.quantity).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                    </p>
                    <p className="text-xs text-[#86868b]">
                      {rp.quantity} x {rp.unitPrice.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                    </p>
                  </div>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between text-sm">
                <span className="font-medium text-[#86868b]">Total pieces</span>
                <span className="font-semibold text-[#1d1d1f]">
                  {totalPartsCost.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Documents */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Documents ({repair.attachments?.length || 0})</CardTitle>
          <div className="flex items-center gap-2 flex-shrink-0">
            <select
              value={attachmentType}
              onChange={(e) => setAttachmentType(e.target.value)}
              className="text-xs sm:text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-[#1d1d1f]"
            >
              <option value="Devis">Devis</option>
              <option value="Facture">Facture</option>
              <option value="Photo">Photo</option>
              <option value="Autre">Autre</option>
            </select>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
              <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#0071e3] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#0077ed] transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {uploading ? "..." : "Uploader"}
              </span>
            </label>
          </div>
        </CardHeader>

        {!repair.attachments || repair.attachments.length === 0 ? (
          <p className="text-sm text-[#86868b] text-center py-4">
            Aucun document ajoute.
          </p>
        ) : (
          <div className="space-y-2">
            {repair.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {att.mimeType === "application/pdf" ? "📄" : "🖼️"}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f]">{att.fileName}</p>
                    <p className="text-xs text-[#86868b]">
                      <Badge variant={att.type === "Devis" ? "info" : att.type === "Facture" ? "purple" : "neutral"}>{att.type}</Badge>
                      {" "}&middot; {(att.size / 1024).toFixed(0)} Ko &middot; {new Date(att.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/repairs/${repair.id}/attachments/${att.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0071e3] hover:text-[#0077ed] text-sm font-medium"
                  >
                    Ouvrir
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteAttachment(att.id)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Status change history */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Historique des changements de statut</CardTitle>
        </CardHeader>
        {repair.statusChanges.length === 0 ? (
          <p className="text-sm text-[#86868b] text-center py-4">Aucun historique.</p>
        ) : (
          <div className="space-y-2">
            {repair.statusChanges.map((sc) => (
              <div key={sc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-gray-50 text-sm gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {sc.fromStatus && (
                    <>
                      <span className="text-[#86868b]">
                        {getStatusLabel(sc.fromStatus, repair.repairType)}
                      </span>
                      <svg className="h-4 w-4 text-[#86868b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                  <span className="font-medium text-[#1d1d1f]">
                    {getStatusLabel(sc.toStatus, repair.repairType)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[#86868b] text-xs sm:text-sm">
                  <span>{sc.user ? `${sc.user.firstName} ${sc.user.lastName}` : "Systeme"}</span>
                  <span>{new Date(sc.createdAt).toLocaleString("fr-FR")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Packlink modal */}
      <Modal isOpen={showPacklinkModal} onClose={() => setShowPacklinkModal(false)} title="📦 Créer le bordereau Chronopost">
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-sm text-orange-800">
            Le bordereau sera créé pour que <strong>{repair?.clientFirstName} {repair?.clientLastName}</strong> envoie son Mac depuis son adresse vers Mac Place.
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
            <strong>Chrono Relais 13h</strong> — 9.53€ · Client dépose au relais Chronopost le plus proche · Livraison à <strong>Consigne Franprix Alfortville</strong> (90 Rue Paul Vaillant Couturier)
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#86868b] mb-1.5">Poids (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="30"
                value={packlinkWeight}
                onChange={(e) => setPacklinkWeight(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#86868b] mb-1.5">Valeur déclarée (€)</label>
              <input
                type="number"
                min="0"
                value={packlinkContentValue}
                onChange={(e) => setPacklinkContentValue(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
          </div>

          <div className="text-xs text-[#86868b] bg-gray-50 rounded-lg p-3 space-y-1">
            <p><span className="font-medium">Dimensions :</span> 35 × 25 × 7 cm (MacBook standard)</p>
            <p><span className="font-medium">Expéditeur :</span> {repair?.clientFirstName} {repair?.clientLastName}, {repair?.clientAddress}, {repair?.clientPostalCode} {repair?.clientCity}</p>
            <p><span className="font-medium">Destinataire :</span> Mac Place, 5 rue Paul Vaillant Couturier, 94700 Maisons Alfort</p>
          </div>

          {shipmentRef && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-orange-800">✓ Bordereau créé — réf. <span className="font-mono">{shipmentRef}</span></p>
              <p className="text-xs text-orange-700">Payez sur Packlink Pro, puis téléchargez l&apos;étiquette.</p>
              <div className="flex gap-2 flex-wrap">
                <a
                  href={`https://pro.packlink.fr/private/shipments/${shipmentRef}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-white px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: "#e8611a" }}
                >
                  💳 Payer sur Packlink Pro
                </a>
                <button
                  type="button"
                  onClick={handleDownloadLabel}
                  disabled={labelLoading}
                  className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 border border-orange-300 px-3 py-1.5 rounded-lg disabled:opacity-50 bg-white"
                >
                  {labelLoading ? "Téléchargement..." : "⬇ Télécharger l'étiquette"}
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowPacklinkModal(false)}>
              Fermer
            </Button>
            {!shipmentRef && (
              <Button
                variant="primary"
                size="sm"
                loading={creatingShipment}
                onClick={handleCreateShipment}
              >
                Créer le bordereau
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Part modal */}
      <Modal isOpen={showPartModal} onClose={() => setShowPartModal(false)} title="Ajouter une piece">
        <div className="space-y-4">
          <Select
            label="Piece"
            options={stockParts.map((p) => ({
              value: p.id,
              label: `${p.name} (${p.sku}) - ${p.quantity} dispo - ${p.sellPrice.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`,
            }))}
            value={selectedPartId}
            onChange={(e) => setSelectedPartId(e.target.value)}
            placeholder="Selectionnez une piece"
          />
          <Input
            label="Quantite"
            type="number"
            min="1"
            value={partQuantity}
            onChange={(e) => setPartQuantity(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowPartModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" loading={addingPart} onClick={handleAddPart}>
              Ajouter
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Modifier la reparation" size="lg">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Prenom"
              value={String(editData.clientFirstName || "")}
              onChange={(e) => setEditData({ ...editData, clientFirstName: e.target.value })}
            />
            <Input
              label="Nom"
              value={String(editData.clientLastName || "")}
              onChange={(e) => setEditData({ ...editData, clientLastName: e.target.value })}
            />
            <Input
              label="Email"
              value={String(editData.clientEmail || "")}
              onChange={(e) => setEditData({ ...editData, clientEmail: e.target.value })}
            />
            <Input
              label="Telephone"
              value={String(editData.clientPhone || "")}
              onChange={(e) => setEditData({ ...editData, clientPhone: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Modele"
              options={MAC_MODELS.map((m) => ({ value: m, label: m }))}
              value={String(editData.macModel || "")}
              onChange={(e) => setEditData({ ...editData, macModel: e.target.value })}
            />
            <Input
              label="N/S"
              value={String(editData.serialNumber || "")}
              onChange={(e) => setEditData({ ...editData, serialNumber: e.target.value })}
            />
            <Select
              label="Type de panne"
              options={FAULT_TYPES.map((f) => ({ value: f, label: f }))}
              value={String(editData.faultType || "")}
              onChange={(e) => setEditData({ ...editData, faultType: e.target.value })}
            />
            {repair?.repairType === "POSTAL" && (
              <Select
                label="Priorite"
                options={PRIORITIES.map((p) => ({ value: p.key, label: p.label }))}
                value={String(editData.priority || "")}
                onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
              />
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {repair?.repairType === "POSTAL" && (
              <>
                <Select
                  label="Technicien"
                  options={[
                    { value: "", label: "Non assigne" },
                    ...technicians.map((t) => ({
                      value: t.id,
                      label: `${t.firstName} ${t.lastName}`,
                    })),
                  ]}
                  value={String(editData.technicianId || "")}
                  onChange={(e) => setEditData({ ...editData, technicianId: e.target.value || null })}
                />
                <Select
                  label="Transporteur"
                  options={[
                    { value: "", label: "Aucun" },
                    ...CARRIERS.map((c) => ({ value: c, label: c })),
                  ]}
                  value={String(editData.carrier || "")}
                  onChange={(e) => setEditData({ ...editData, carrier: e.target.value })}
                />
                <Input
                  label="Suivi entrant"
                  value={String(editData.inboundTracking || "")}
                  onChange={(e) => setEditData({ ...editData, inboundTracking: e.target.value })}
                />
                <Input
                  label="Suivi sortant"
                  value={String(editData.outboundTracking || "")}
                  onChange={(e) => setEditData({ ...editData, outboundTracking: e.target.value })}
                />
                <Input
                  label="Lien suivi Chronopost"
                  placeholder="https://www.chronopost.fr/..."
                  value={String(editData.trackingLink || "")}
                  onChange={(e) => setEditData({ ...editData, trackingLink: e.target.value })}
                />
                <Input
                  label="Lien de paiement"
                  placeholder="https://..."
                  value={String(editData.paymentLink || "")}
                  onChange={(e) => setEditData({ ...editData, paymentLink: e.target.value })}
                />
              </>
            )}
            <Input
              label="Cout estime"
              type="number"
              step="0.01"
              value={String(editData.estimatedCost || "")}
              onChange={(e) => setEditData({ ...editData, estimatedCost: parseFloat(e.target.value) || 0 })}
            />
            {repair?.repairType === "POSTAL" && (
              <Input
                label="Cout final"
                type="number"
                step="0.01"
                value={String(editData.finalCost || "")}
                onChange={(e) => setEditData({ ...editData, finalCost: parseFloat(e.target.value) || 0 })}
              />
            )}
            {(repair?.repairType === "LOCAL" || repair?.repairType === "HOME") && (
              <Input
                label="Date et heure du rendez-vous"
                type="datetime-local"
                value={String(editData.appointmentDate || "")}
                onChange={(e) => setEditData({ ...editData, appointmentDate: e.target.value || null })}
              />
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-100">
          <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
            Annuler
          </Button>
          <Button variant="primary" size="sm" loading={saving} onClick={handleSaveEdit}>
            Enregistrer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
