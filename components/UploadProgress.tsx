'use client';

interface UploadProgressProps {
  fileName: string;
  progress: number;
}

const UploadProgress = ({ fileName, progress }: UploadProgressProps) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '300px',
        padding: '16px',
        backgroundColor: 'rgb(41, 41, 41)',
        borderRadius: '8px',
        boxShadow: '0 6.4px 14.4px 0 rgba(0, 0, 0, 0.432)',
        zIndex: 10000,
        fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif'
      }}
    >
      <div style={{ marginBottom: '8px', color: 'rgb(255, 255, 255)', fontSize: '14px', fontWeight: 600 }}>
        Uploading...
      </div>
      <div style={{ marginBottom: '8px', color: 'rgb(173, 173, 173)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {fileName}
      </div>
      <div style={{ width: '100%', height: '4px', backgroundColor: 'rgb(60, 60, 60)', borderRadius: '2px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: 'rgb(0, 120, 212)',
            transition: 'width 0.3s ease'
          }}
        />
      </div>
      <div style={{ marginTop: '8px', color: 'rgb(173, 173, 173)', fontSize: '12px', textAlign: 'right' }}>
        {Math.round(progress)}%
      </div>
    </div>
  );
};

export default UploadProgress;
