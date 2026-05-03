import type { ArtifactAddedEvent } from "../types"

export function SourcePreview({
  artifact,
  onClose
}: {
  artifact: ArtifactAddedEvent
  onClose: () => void
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="source-preview" onClick={(e) => e.stopPropagation()}>
        <div className="source-preview-header">
          <span className="kind">{artifact.kind}</span>
          <span className="location">{artifact.label ?? artifact.location}</span>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="source-preview-body">
          {artifact.kind === "url" && (
            <iframe src={artifact.location} title={artifact.label ?? artifact.location} />
          )}
          {artifact.kind === "file" && (
            <div className="unsupported">
              <div style={{ marginBottom: 8 }}>{artifact.location}</div>
              <div>File preview not supported yet.</div>
            </div>
          )}
          {artifact.kind === "snippet" && <pre>{artifact.location}</pre>}
        </div>
      </div>
    </div>
  )
}
