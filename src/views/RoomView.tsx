import React, { useState, useRef, useEffect } from 'react';
import {
  RoomInfoBar,
  Button,
  Card,
  EmptyState,
  Alert,
  QrCodeModal,
  MessageBubble,
  Badge,
  ProgressBar,
  FileItemRow,
} from '../components/ui';
import { TrashIcon, ShieldIcon, SendIcon, ArchiveIcon, EraserIcon } from '../components/icons';
import { api } from '../services/api';
import { RoomSummary } from '../../shared/types';
import { useRoomSync } from '../hooks/useRoomSync';
import { recentRoomsService } from '../services/recentRooms';
import confetti from 'canvas-confetti';

export interface RoomViewProps {
  room: RoomSummary;
  sessionToken: string;
  onLeave: () => void;
  onExpired: (reason?: string) => void;
  onDeleted?: (reason?: string) => void;
}

export const RoomView: React.FC<RoomViewProps> = ({
  room,
  sessionToken,
  onLeave,
  onExpired,
  onDeleted,
}) => {
  // Ensure room code is always available even if backend returned empty code
  const effectiveRoomCode =
    room.code && /^\d{4}$/.test(room.code.trim())
      ? room.code
      : recentRoomsService.getRecentRooms().find((r) => r.id === room.id)?.code || room.code || '';

  const { items, isConnected, postTextItem, deleteItem, error: syncError } = useRoomSync({
    roomId: room.id,
    sessionToken,
    onRoomExpired: onExpired,
    onRoomDeleted: onDeleted,
  });

  const [composerText, setComposerText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isClearingNotes, setIsClearingNotes] = useState(false);

  // File Upload & Drag State
  const [isDragging, setIsDragging] = useState(false);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadName, setCurrentUploadName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Keyboard shortcut listener: Esc closes modals
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowQrModal(false);
        setShowDeleteConfirm(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Filter notes/links vs files, sorted latest first (newest on top)
  const textItems = [...items.filter((item) => item.type === 'text' || item.type === 'link')].sort(
    (a, b) => b.createdAt - a.createdAt
  );
  const fileItems = [...items.filter((item) => item.type === 'file')].sort(
    (a, b) => b.createdAt - a.createdAt
  );

  // Global window-level drag and drop listener (Priority Harden Item)
  useEffect(() => {
    const handleWindowDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current += 1;
      if (e.dataTransfer?.types.includes('Files')) {
        setIsGlobalDragging(true);
      }
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current -= 1;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsGlobalDragging(false);
      }
    };

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsGlobalDragging(false);
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
        handleUploadFiles(files);
      }
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [fileItems.length]);

  // Calculate used storage
  const totalFileBytes = fileItems.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
  const totalUsedMb = (totalFileBytes / (1024 * 1024)).toFixed(1);

  const handleSendText = async () => {
    if (!composerText.trim() || isSending) return;

    setIsSending(true);
    setActionError(null);

    try {
      await postTextItem(composerText.trim());
      setComposerText('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to drop note into room.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleUploadFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;

    // Constraint 1: Maximum 20 files per room
    const remainingSlots = 20 - fileItems.length;
    if (remainingSlots <= 0) {
      setActionError('Maximum limit of 20 files reached for this room.');
      return;
    }
    if (files.length > remainingSlots) {
      setActionError(
        `Cannot upload ${files.length} file(s). Only ${remainingSlots} slot(s) remaining (maximum 20 files per room).`
      );
      return;
    }

    // Constraint 2: Individual file size limit (50 MiB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    const oversized = files.find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      setActionError(
        `"${oversized.name}" exceeds the 50 MiB limit (${(oversized.size / (1024 * 1024)).toFixed(1)} MiB).`
      );
      return;
    }

    // Constraint 3: Total room capacity limit (200 MiB)
    const MAX_ROOM_BYTES = 200 * 1024 * 1024;
    const incomingBytes = files.reduce((acc, f) => acc + f.size, 0);
    if (totalFileBytes + incomingBytes > MAX_ROOM_BYTES) {
      const remainingBytes = Math.max(0, MAX_ROOM_BYTES - totalFileBytes);
      setActionError(
        `Selected files (${(incomingBytes / (1024 * 1024)).toFixed(1)} MB) exceed available room capacity (${(remainingBytes / (1024 * 1024)).toFixed(1)} MB remaining of 200 MB quota).`
      );
      return;
    }

    setIsUploading(true);
    setActionError(null);

    const totalFiles = files.length;
    let successfulCount = 0;
    const failedFiles: { name: string; error: string }[] = [];

    try {
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const label = totalFiles > 1 ? `(${i + 1}/${totalFiles}) ${file.name}` : file.name;
        setCurrentUploadName(label);
        setUploadProgress(0);

        try {
          await api.uploadFile(room.id, sessionToken, file, (progress) => {
            const overall = Math.round(((i + progress / 100) / totalFiles) * 100);
            setUploadProgress(overall);
          });
          successfulCount++;
        } catch (err: any) {
          failedFiles.push({ name: file.name, error: err.message || 'Upload failed' });
        }
      }

      if (successfulCount > 0) {
        try {
          confetti({
            particleCount: 35,
            spread: 55,
            origin: { y: 0.6 },
            colors: ['#FFE000', '#00D084', '#000000'],
            disableForReducedMotion: true,
          });
        } catch {
          // Ignore
        }
      }

      if (failedFiles.length > 0) {
        setActionError(
          `${successfulCount} of ${totalFiles} file(s) uploaded. Failed: ${failedFiles.map((f) => `"${f.name}" (${f.error})`).join(', ')}`
        );
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setCurrentUploadName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleUploadFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      handleUploadFiles(files);
    }
  };

  const handleFileDownload = async (item: any) => {
    try {
      await api.downloadFile(room.id, item.id, sessionToken, item.filename || 'download');
    } catch (err: any) {
      setActionError(err.message || 'Failed to download file.');
    }
  };

  const handleDownloadZip = async () => {
    if (items.length === 0) {
      setActionError('No files or notes to download.');
      return;
    }

    setIsDownloadingZip(true);
    setActionError(null);

    try {
      await api.downloadAllZip(room.id, sessionToken, room.code);
    } catch (err: any) {
      setActionError(err.message || 'Failed to download ZIP archive.');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleDeleteRoom = async () => {
    setIsDeleting(true);
    setActionError(null);

    try {
      await api.deleteRoom(room.id, sessionToken);
      recentRoomsService.removeRecentRoom(room.code);
      onLeave();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete room.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleClearAllNotes = async () => {
    if (textItems.length === 0 || isClearingNotes) return;
    setIsClearingNotes(true);
    setActionError(null);

    try {
      await Promise.all(textItems.map((item) => deleteItem(item.id)));
    } catch (err: any) {
      setActionError(err.message || 'Failed to clear notes.');
    } finally {
      setIsClearingNotes(false);
    }
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 20px' }}>
      {/* Error Alerts */}
      {(actionError || syncError) && (
        <div style={{ marginBottom: '16px' }}>
          <Alert
            variant="error"
            message={actionError || syncError || ''}
            onDismiss={() => setActionError(null)}
          />
        </div>
      )}

      {/* Unified Master Control Deck (Leave, Wifi Status Logo, Code Badge, Share Button, Expiry, Delete) */}
      <div style={{ marginBottom: '24px' }}>
        <RoomInfoBar
          roomCode={effectiveRoomCode}
          expiresAt={room.expiresAt}
          isConnected={isConnected}
          onLeave={onLeave}
          isOwner={room.isOwner}
          onDelete={() => setShowDeleteConfirm(true)}
          onShare={() => setShowQrModal(true)}
        />
      </div>

      {/* Main Room Layout: Left (Notes & Composer) | Right (Files) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Left Column: Text & Link Feed + Composer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Text Composer Card */}
          <Card variant="default" padding="md">
            <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Drop Note or Link</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '12px' }}>
              Paste terminal commands, code snippets, URLs, or notes.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <textarea
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type or paste anything here... (Ctrl+Enter to send)"
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: 'var(--border-thick)',
                  boxShadow: 'var(--shadow-small)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '15px',
                  color: 'var(--color-ink)',
                  backgroundColor: 'var(--color-surface-card)',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)' }}>
                  {composerText.length > 0 ? `${(composerText.length / 1024).toFixed(1)} KB / 100 KB` : 'Max 100 KiB'}
                </span>

                <Button
                  size="sm"
                  variant="primary"
                  isLoading={isSending}
                  disabled={!composerText.trim()}
                  rightIcon={<SendIcon size={16} />}
                  onClick={handleSendText}
                >
                  Drop Item
                </Button>
              </div>
            </div>
          </Card>

          {/* Notes & Links Feed Card */}
          <Card variant="surface" padding="md">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px' }}>Shared Notes ({textItems.length})</h2>
                {textItems.length > 0 && (
                  <Badge variant="new" size="sm">
                    ACTIVE FEED
                  </Badge>
                )}
              </div>
              {room.isOwner && textItems.length > 0 && (
                <Button
                  size="sm"
                  variant="surface"
                  isLoading={isClearingNotes}
                  leftIcon={<EraserIcon size={14} />}
                  onClick={handleClearAllNotes}
                  title="Clear all shared notes from room"
                >
                  Clear Notes
                </Button>
              )}
            </div>

            {textItems.length === 0 ? (
              <EmptyState
                title="No notes shared yet"
                description="Drop a link, note, or code snippet above to share across devices."
                actionText=""
                showMascot={false}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {textItems.map((item) => (
                  <MessageBubble
                    key={item.id}
                    id={item.id}
                    text={item.textContent || ''}
                    isLink={item.type === 'link'}
                    type={item.type === 'link' ? 'link' : undefined}
                    timestamp={item.createdAt}
                    canDelete={item.canDelete ?? room.isOwner}
                    onDelete={() => deleteItem(item.id)}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Uploaded Files & Dropzone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card variant="default" padding="md">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
              }}
            >
              <h2 style={{ fontSize: '18px' }}>Room Files ({fileItems.length}/20)</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge variant="file" size="sm">
                  {totalUsedMb} MB / 200 MB
                </Badge>
                {items.length > 0 && (
                  <Button
                    size="sm"
                    variant="surface"
                    isLoading={isDownloadingZip}
                    leftIcon={<ArchiveIcon size={14} />}
                    onClick={handleDownloadZip}
                    title="Download all files and notes as a ZIP"
                  >
                    Download All (.zip)
                  </Button>
                )}
              </div>
            </div>

            {/* Hidden native file input with multiple selection */}
            <input
              type="file"
              ref={fileInputRef}
              multiple
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />

            {/* Active Upload Progress */}
            {isUploading && (
              <div style={{ marginBottom: '16px' }}>
                <ProgressBar
                  progress={uploadProgress}
                  label={`Uploading: ${currentUploadName}`}
                />
              </div>
            )}

            {/* Drag and drop target */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{ marginBottom: '16px' }}
            >
              <EmptyState
                title="Drop files here or click to browse"
                description="Drop single or multiple files (up to 50 MiB each). Automatically deletes in 24 hours."
                actionText="Upload Files"
                isDragOver={isDragging}
                onAction={() => fileInputRef.current?.click()}
              />
            </div>

            {/* Uploaded Files Feed */}
            {fileItems.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {fileItems.map((file) => (
                  <FileItemRow
                    key={file.id}
                    id={file.id}
                    filename={file.filename || 'uploaded-file'}
                    sizeBytes={file.sizeBytes}
                    mimeType={file.mimeType}
                    onDownload={() => handleFileDownload(file)}
                    canDelete={file.canDelete ?? room.isOwner}
                    onDelete={() => deleteItem(file.id)}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* QR Code Modal */}
      <QrCodeModal
        roomCode={effectiveRoomCode}
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
      />

      {/* Delete Room Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 100,
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="nb-modal-content"
            style={{
              backgroundColor: 'var(--color-surface-card)',
              border: 'var(--border-thick)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-large)',
              maxWidth: '420px',
              width: '100%',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  backgroundColor: 'var(--color-error)',
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '2px solid var(--color-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldIcon size={24} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800 }}>
                Delete Room Immediately?
              </h3>
            </div>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.4 }}>
              This will immediately revoke access for all connected devices and permanently erase all
              uploaded files and notes. This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <Button
                variant="surface"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isDeleting}
                leftIcon={<TrashIcon size={16} />}
                onClick={handleDeleteRoom}
              >
                Yes, Delete Room
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Full-viewport Drag and Drop Overlay (Harden & Delight) */}
      {isGlobalDragging && (
        <div
          role="region"
          aria-label="Drop files overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(255, 224, 0, 0.95)',
            border: '8px dashed var(--color-ink)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            pointerEvents: 'none',
          }}
        >
          <picture>
            <source srcSet="/assets/Happy.webp" type="image/webp" />
            <img
              src="/assets/Happy.png"
              alt="Drop files anywhere"
              width={140}
              height={140}
              decoding="async"
              style={{
                width: '140px',
                height: '140px',
                objectFit: 'contain',
              }}
            />
          </picture>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '36px',
              fontWeight: 900,
              color: 'var(--color-ink)',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              textAlign: 'center',
            }}
          >
            Drop files anywhere to share!
          </h2>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '15px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              backgroundColor: 'var(--color-ink)',
              color: '#FFFFFF',
              padding: '8px 18px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            ROOM {room.code} · UP TO 50 MiB PER FILE · UP TO 20 FILES
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomView;
