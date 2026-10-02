'use client';

import { CloudUploadOutlined, DeleteOutline, Refresh } from '@mui/icons-material';
import { Box, Button, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import { ComponentPropsWithRef, DragEvent, useId, useRef, useState } from 'react';

export type UploadedFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  progress: number;
  failed?: boolean;
};

export const getReadableFileSize = (bytes: number) => {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** index);
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
};

type DropZoneProps = {
  accept?: string;
  allowsMultiple?: boolean;
  hint?: string;
  isDisabled?: boolean;
  maxSize?: number;
  onDropFiles?: (files: FileList) => void;
  onDropUnacceptedFiles?: (files: FileList) => void;
  onSizeLimitExceed?: (files: FileList) => void;
};

function acceptsFile(file: File, accept?: string) {
  if (!accept) return true;
  return accept.split(',').map(value => value.trim().toLowerCase()).some(value => {
    if (value.startsWith('.')) return file.name.toLowerCase().endsWith(value);
    if (value.endsWith('/*')) return file.type.toLowerCase().startsWith(value.slice(0, -1));
    return file.type.toLowerCase() === value;
  });
}

function asFileList(files: File[]) {
  const transfer = new DataTransfer();
  files.forEach(file => transfer.items.add(file));
  return transfer.files;
}

function FileUploadDropZone({ accept, allowsMultiple = false, hint, isDisabled, maxSize, onDropFiles, onDropUnacceptedFiles, onSizeLimitExceed }: DropZoneProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const process = (source: FileList) => {
    const candidates = Array.from(source).slice(0, allowsMultiple ? undefined : 1);
    const tooLarge = candidates.filter(file => maxSize && file.size > maxSize);
    const wrongType = candidates.filter(file => !(maxSize && file.size > maxSize) && !acceptsFile(file, accept));
    const accepted = candidates.filter(file => !(maxSize && file.size > maxSize) && acceptsFile(file, accept));
    if (tooLarge.length) onSizeLimitExceed?.(asFileList(tooLarge));
    if (wrongType.length) onDropUnacceptedFiles?.(asFileList(wrongType));
    if (accepted.length) onDropFiles?.(asFileList(accepted));
    if (inputRef.current) inputRef.current.value = '';
  };

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isDisabled) return;
    setDragging(false);
    process(event.dataTransfer.files);
  };

  return <Box
    className={`leaders-upload-dropzone${dragging ? ' is-dragging' : ''}${isDisabled ? ' is-disabled' : ''}`}
    onDragEnter={event => { event.preventDefault(); if (!isDisabled) setDragging(true); }}
    onDragOver={event => event.preventDefault()}
    onDragLeave={event => { if (event.currentTarget === event.target) setDragging(false); }}
    onDrop={drop}
  >
    <Box className="leaders-upload-icon" aria-hidden="true"><CloudUploadOutlined /></Box>
    <Box sx={{ minWidth: 0, textAlign: 'center' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="center" gap={.75}>
        <Button component="label" htmlFor={id} disabled={isDisabled} size="small">
          Choose a file
          <input ref={inputRef} id={id} hidden type="file" accept={accept} multiple={allowsMultiple} disabled={isDisabled} onChange={event => event.target.files && process(event.target.files)} />
        </Button>
        <Typography variant="body2" color="text.secondary">or drag and drop</Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary">{hint || 'Choose a supported file.'}</Typography>
    </Box>
  </Box>;
}

type ListItemProps = UploadedFile & { onDelete?: () => void; onRetry?: () => void };

function FileListItemProgressBar({ name, size, progress, failed, onDelete, onRetry }: ListItemProps) {
  const complete = progress >= 100 && !failed;
  return <Box component="li" className={`leaders-upload-file${failed ? ' is-failed' : ''}`}>
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={750} noWrap>{name}</Typography>
          <Typography variant="caption" color={failed ? 'error.main' : 'text.secondary'}>
            {getReadableFileSize(size)} · {failed ? 'Could not read file' : complete ? 'Ready to save' : `Reading ${Math.round(progress)}%`}
          </Typography>
        </Box>
        <Stack direction="row" gap={.25}>
          {failed && <IconButton size="small" aria-label={`Retry ${name}`} onClick={onRetry}><Refresh fontSize="small" /></IconButton>}
          <IconButton size="small" color="error" aria-label={`Remove ${name}`} onClick={onDelete}><DeleteOutline fontSize="small" /></IconButton>
        </Stack>
      </Stack>
      {!failed && <LinearProgress variant="determinate" value={Math.min(100, progress)} sx={{ mt: 1, height: 5, borderRadius: 99, bgcolor: 'rgba(21,94,104,.1)', '& .MuiLinearProgress-bar': { borderRadius: 99, background: complete ? '#217A50' : 'linear-gradient(90deg,#155E68,#B7791F)' } }} />}
    </Box>
  </Box>;
}

const Root = (props: ComponentPropsWithRef<'div'>) => <Box {...props} className={`leaders-upload-root ${props.className || ''}`}>{props.children}</Box>;
const List = (props: ComponentPropsWithRef<'ul'>) => <Box component="ul" {...props} className={`leaders-upload-list ${props.className || ''}`}>{props.children}</Box>;

export const FileUpload = {
  Root,
  DropZone: FileUploadDropZone,
  List,
  ListItemProgressBar: FileListItemProgressBar,
};
