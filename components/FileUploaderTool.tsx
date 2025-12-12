import React from 'react';

interface FileUploaderToolProps {
  gapiClient: any;
}

const FileUploaderTool: React.FC<FileUploaderToolProps> = ({ gapiClient }) => {
  return (
    <div className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] rounded-xl p-8 shadow-2xl border border-[var(--color-border)] w-full max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-2 text-[var(--color-text-primary)] text-center">File Uploader</h2>
      <p className="text-center text-[var(--color-text-secondary)]">This tool is not yet implemented.</p>
    </div>
  );
};

export default FileUploaderTool;
