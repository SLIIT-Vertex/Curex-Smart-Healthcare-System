import { useState, useEffect, useCallback } from "react";
import type { ChangeEvent } from "react";
import {
  FileText,
  UploadCloud,
  Trash2,
  Download,
  Search,
  Loader2,
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
      const patient = await getPatientByUserId(user.id);
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
  }, [user?.id, user?.role]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !patientId) return;

    // Basic validation
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
    if (!allowedTypes.includes(file.type)) {
      toast("Please upload a PDF, PNG, or JPEG file.", "error");
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
        <div className="patient-loading-skeleton h-12 w-48" />
        <div className="patient-card p-8 flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mt-4" />
          <p className="mt-2 text-text-secondary">Loading your reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-stretch gap-4">
        <span className="flex w-12 shrink-0 items-center justify-center rounded-xl bg-accent-sky/15 text-accent-sky">
          <FileText className="h-7 w-7" strokeWidth={1.5} />
        </span>
        <div>
          <h1 className="section-heading">Medical Reports</h1>
          <p className="section-subtext mt-1">
            Browse and manage your clinical documents and lab results.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-primary">
          {error}
        </div>
      )}

      {/* Upload Section */}
      <div className="patient-card p-6">
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-text-secondary/20 rounded-2xl p-8 bg-background/30 hover:bg-background/50 transition-colors">
          <UploadCloud
            className="h-12 w-12 text-primary/60 mb-4"
            strokeWidth={1}
          />
          <h3 className="text-lg font-medium text-primary">
            Upload New Report
          </h3>
          <p className="text-sm text-text-secondary mt-1 mb-6 text-center max-w-sm">
            Drag and drop your medical reports here, or click to browse files.
            <br />
            Supported formats: PDF, PNG, JPG (Max 10MB)
          </p>

          <label
            className={`patient-btn-primary cursor-pointer flex items-center gap-2 ${uploading ? "opacity-70 pointer-events-none" : ""}`}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            {uploading ? "Uploading..." : "Select File"}
            <input
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* List Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-primary">Your Reports</h2>
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search reports by name..."
              className="patient-page-input w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredReports.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="patient-card p-4 hover:shadow-lg transition-shadow border border-text-secondary/10 flex flex-col group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg text-primary">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="overflow-hidden">
                      <h4
                        className="font-medium text-primary truncate"
                        title={report.originalFilename}
                      >
                        {report.originalFilename}
                      </h4>
                      <p className="text-xs text-text-secondary">
                        {formatBytes(report.fileSize)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-text-secondary/10 flex items-center justify-between">
                  <span className="text-xs text-text-secondary">
                    {formatDate(report.uploadedAt)}
                  </span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={report.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-accent-sky/10 text-accent-sky transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(report.id)}
                      className="p-2 rounded-lg hover:bg-error/10 text-error transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="patient-card p-12 flex flex-col items-center justify-center text-center bg-background/30 border-dashed border-2 border-text-secondary/10">
            <p className="text-text-secondary mb-2">
              {searchTerm
                ? "No reports found matching your search."
                : "You haven't uploaded any reports yet."}
            </p>
            {!searchTerm && (
              <p className="text-xs text-text-secondary">
                Start by uploading your first medical document above.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
