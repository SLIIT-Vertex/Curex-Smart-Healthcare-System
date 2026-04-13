import { useState, useEffect, useCallback } from "react";
import type { ChangeEvent } from "react";
import {
  FileText,
  UploadCloud,
  Trash2,
  Download,
  Search,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Image as ImageIcon,
  Clock,
  ExternalLink,
} from "lucide-react";
import { reportService } from "../../services/reportService";
import { getPatientByUserId } from "../../services/patientService";
import type { Report } from "../../types/report";
import { useAuth } from "../../store/hooks";
import { useToast } from "../../store/hooks";

/** Use mock data when backend is unavailable (e.g. during development). */
const USE_MOCK_ON_ERROR = true;

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PatientReports() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [patientId, setPatientId] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!user?.id || user.role !== "PATIENT") return;
    setLoading(true);
    setError(null);
    try {
      // Pass the whole user object to allow auto-creation if patient-service entry is missing.
      const patient = await getPatientByUserId(user.id, user);
      setPatientId(patient.id);
      const data = await reportService.getReportsForPatient(patient.id);
      setReports(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load reports";
      setError(msg);
      if (USE_MOCK_ON_ERROR) {
        setReports([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !patientId) return;

    // Basic validation
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast("Please upload a PDF, PNG, JPEG, or WebP file.", "error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast("File size must be less than 10MB.", "error");
      return;
    }

    setUploading(true);
    try {
      await reportService.uploadReport(patientId, file);
      toast("Report uploaded successfully!", "success");
      fetchReports(); // Refresh list
    } catch {
      toast("Failed to upload report. Please try again.", "error");
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    try {
      await reportService.deleteReport(id);
      toast("Report deleted successfully.", "success");
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast("Failed to delete report.", "error");
    }
  };

  const filteredReports = reports.filter((r) =>
    r.originalFilename.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading && !patientId) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-48 animate-pulse rounded-xl bg-primary/10" />
        <div className="patient-card p-12 flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
          <p className="mt-4 text-text-secondary font-medium">Securing your records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-stretch gap-4">
          <div className="flex w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-sky/20 to-primary/10 text-primary shadow-sm border border-primary/5">
            <FileText className="h-8 w-8" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Medical Reports</h1>
            <p className="text-text-secondary mt-1">
              Securely manage your laboratory results and clinical documentation.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-error/20 bg-error/5 px-4 py-4 text-sm text-primary flex items-center gap-3 animate-in shake-1">
          <AlertCircle className="h-5 w-5 text-error shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="patient-card overflow-hidden group">
            <div className="h-1.5 w-full bg-gradient-to-r from-primary to-accent-sky" />
            <div className="p-8">
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <UploadCloud className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-2">New Upload</h3>
                <p className="text-sm text-text-secondary mb-8">
                  PDF, PNG, JPG, or WebP formats supported.<br/>Maximum size 10MB.
                </p>

                <label
                  className={`relative overflow-hidden w-full patient-btn-primary cursor-pointer flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all ${uploading ? "opacity-70 pointer-events-none" : ""}`}
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <UploadCloud className="h-5 w-5" />
                  )}
                  {uploading ? "Processing..." : "Secure Upload"}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  {uploading && (
                    <div className="absolute inset-0 bg-white/10 animate-pulse" />
                  )}
                </label>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/5 to-accent-sky/5 rounded-3xl p-6 border border-primary/10">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="h-5 w-5 text-accent-mint" />
              <h4 className="font-semibold text-primary">Confidential Storage</h4>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Your medical reports are stored using industry-standard encryption. Only authorized medical staff attending to your appointments can access these documents.
            </p>
          </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              Recent Documents
              <span className="text-xs font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {filteredReports.length}
              </span>
            </h2>
            <div className="relative w-full max-w-xs group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search reports..."
                className="w-full pl-10 pr-4 py-2 bg-background border border-text-secondary/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredReports.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="bg-surface rounded-2xl border border-text-secondary/5 p-5 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col relative"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-gradient-to-br from-primary/10 to-accent-sky/10 p-3 rounded-xl text-primary group-hover:scale-110 transition-transform duration-500">
                        {report.contentType.includes('pdf') ? <FileText className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
                      </div>
                      <div className="min-w-0 pr-8">
                        <h4
                          className="font-bold text-primary truncate text-sm"
                          title={report.originalFilename}
                        >
                          {report.originalFilename}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary/60">
                            {formatBytes(report.fileSize)}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-text-secondary/30" />
                          <span className="text-[10px] font-medium text-text-secondary/60">
                            {report.contentType.split('/')[1]?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-text-secondary/5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <Clock className="h-3 w-3" />
                      <span className="text-[11px] font-medium">
                        {formatDate(report.uploadedAt)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <a
                        href={report.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-accent-sky/10 text-accent-sky transition-colors flex items-center gap-1.5 text-xs font-semibold"
                        title="View Document"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>View</span>
                      </a>
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="p-2 rounded-lg hover:bg-error/10 text-error transition-all hover:scale-105"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="patient-card p-16 flex flex-col items-center justify-center text-center bg-background/30 border-dashed border-2 border-text-secondary/10 rounded-3xl">
              <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                <FileText className="h-10 w-10 text-text-secondary/30" strokeWidth={1} />
              </div>
              <h4 className="text-lg font-bold text-primary mb-2">
                {searchTerm ? "No matches found" : "No reports yet"}
              </h4>
              <p className="text-sm text-text-secondary max-w-xs mx-auto mb-6">
                {searchTerm
                  ? `We couldn't find any reports matching "${searchTerm}". Try a different search term.`
                  : "Your medical history folder is currently empty. Upload your first report to get started."}
              </p>
              {!searchTerm && (
                <div className="flex items-center gap-2 text-xs font-medium text-primary bg-primary/5 px-3 py-1.5 rounded-full">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  End-to-end encrypted storage
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
