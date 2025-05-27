import React, { useState, useEffect } from 'react';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Typography,
    Box,
    Chip,
    Card,
    CardContent,
    CardActions,
    Divider,
    Tooltip,
    Alert,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@mui/material';
import {
    Folder as FolderIcon,
    History as HistoryIcon,
    TableChart as TableIcon,
    Close as CloseIcon,
    Delete as DeleteIcon,
    InsertDriveFile as FileIcon,
    Storage as StorageIcon,
    ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import axios from 'axios';

export interface FileInfo {
    parent_id: string;
    original_filename?: string;
    first_version_name: string;
    first_version_created: string;
    first_version_created_by: string;
    most_recent_version_name?: string;
    most_recent_version_created?: string;
    version_count: number;
    columns: string[];
    column_count: number;
}

interface StorageUsage {
    total_size: {
        bytes: number;
        readable: string;
    };
    total_files: number;
    total_versions: number;
    file_breakdown: {
        [parent_id: string]: {
            total_size: {
                bytes: number;
                readable: string;
            };
            version_count: number;
            versions: Array<{
                version_id: string;
                name: string;
                size: {
                    bytes: number;
                    readable: string;
                };
                created_at: string;
            }>;
        };
    };
}

interface FileManagerProps {
    currentParentId: string | null;
    onFileActivate: (parentId: string, fileInfo: FileInfo) => Promise<void>;
    onFileDeleted?: () => void; // Callback when a file is deleted
}

export const FileManager: React.FC<FileManagerProps> = ({
    currentParentId,
    onFileActivate,
    onFileDeleted
}) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [files, setFiles] = useState<FileInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
    const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
    const [loadingStorage, setLoadingStorage] = useState(false);

    const fetchFiles = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get('http://localhost:8000/files/list');
            setFiles(response.data);
        } catch (err) {
            console.error('Error fetching files:', err);
            if (axios.isAxiosError(err)) {
                setError(`Error fetching files: ${err.response?.data?.detail || err.message}`);
            } else {
                setError('Error fetching files. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchStorageUsage = async () => {
        try {
            setLoadingStorage(true);
            const response = await axios.get('http://localhost:8000/storage/usage');
            setStorageUsage(response.data);
        } catch (err) {
            console.error('Error fetching storage usage:', err);
            // Don't show error for storage usage as it's supplementary info
        } finally {
            setLoadingStorage(false);
        }
    };

    const handleOpenDialog = () => {
        setIsDialogOpen(true);
        fetchFiles();
        fetchStorageUsage();
    };

    const handleActivateFile = async (fileInfo: FileInfo) => {
        try {
            await onFileActivate(fileInfo.parent_id, fileInfo);
            setIsDialogOpen(false);
        } catch (err) {
            console.error('Error activating file:', err);
            setError('Error switching to file. Please try again.');
        }
    };

    const handleDeleteFile = async (fileInfo: FileInfo, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent card click
        
        if (!confirm(`Are you sure you want to delete "${fileInfo.original_filename || fileInfo.first_version_name}" and all its ${fileInfo.version_count} version(s)? This action cannot be undone.`)) {
            return;
        }

        try {
            setDeletingFileId(fileInfo.parent_id);
            setError(null);
            
            const response = await axios.delete(`http://localhost:8000/files/${fileInfo.parent_id}`);
            
            // Refresh the files list
            await fetchFiles();
            
            // If we deleted the currently active file, notify parent
            if (fileInfo.parent_id === currentParentId && onFileDeleted) {
                onFileDeleted();
            }
            
            // Refresh storage usage after deletion
            await fetchStorageUsage();
            
            console.log('File deleted successfully:', response.data.message);
        } catch (err) {
            console.error('Error deleting file:', err);
            if (axios.isAxiosError(err)) {
                setError(`Error deleting file: ${err.response?.data?.detail || err.message}`);
            } else {
                setError('Error deleting file. Please try again.');
            }
        } finally {
            setDeletingFileId(null);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const truncateColumns = (columns: string[], maxLength: number = 50) => {
        const joined = columns.join(', ');
        if (joined.length <= maxLength) return joined;
        return joined.substring(0, maxLength) + '...';
    };

    const getDisplayName = (file: FileInfo) => {
        return file.original_filename || file.first_version_name;
    };

    return (
        <>
            <Button
                variant="outlined"
                startIcon={<FolderIcon />}
                onClick={handleOpenDialog}
                sx={{ mb: 2 }}
            >
                File History ({files.length})
            </Button>

            <Dialog
                open={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6">File History</Typography>
                        <IconButton onClick={() => setIsDialogOpen(false)}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                
                <DialogContent>
                    {/* Storage Usage Section */}
                    {storageUsage && (
                        <Alert 
                            severity="info" 
                            icon={<StorageIcon />}
                            sx={{ mb: 2 }}
                        >
                            <Typography variant="body2">
                                <strong>Total Storage Used:</strong> {storageUsage.total_size.readable} 
                                ({storageUsage.total_files} files, {storageUsage.total_versions} versions)
                            </Typography>
                        </Alert>
                    )}

                    {loading && (
                        <Typography>Loading files...</Typography>
                    )}
                    
                    {error && (
                        <Typography color="error" sx={{ mb: 2 }}>
                            {error}
                        </Typography>
                    )}
                    
                    {!loading && files.length === 0 && (
                        <Typography color="text.secondary">
                            No files found. Upload a file to get started.
                        </Typography>
                    )}
                    
                    {!loading && files.length > 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {files.map((file) => {
                                const fileStorage = storageUsage?.file_breakdown[file.parent_id];
                                
                                return (
                                    <Card 
                                        key={file.parent_id}
                                        variant={file.parent_id === currentParentId ? "outlined" : "elevation"}
                                        sx={{
                                            border: file.parent_id === currentParentId ? 2 : 1,
                                            borderColor: file.parent_id === currentParentId ? 'primary.main' : 'divider',
                                            opacity: deletingFileId === file.parent_id ? 0.5 : 1
                                        }}
                                    >
                                        <CardContent>
                                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <FileIcon color="primary" />
                                                    <Box>
                                                        <Typography variant="h6" component="div">
                                                            {getDisplayName(file)}
                                                            {file.parent_id === currentParentId && (
                                                                <Chip
                                                                    label="Current"
                                                                    color="primary"
                                                                    size="small"
                                                                    sx={{ ml: 1 }}
                                                                />
                                                            )}
                                                        </Typography>
                                                        {file.original_filename && file.original_filename !== file.first_version_name && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                First version: {file.first_version_name}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Box>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Chip
                                                        label={`${file.version_count} version${file.version_count !== 1 ? 's' : ''}`}
                                                        color="secondary"
                                                        size="small"
                                                    />
                                                    {fileStorage && (
                                                        <Chip
                                                            label={fileStorage.total_size.readable}
                                                            color="default"
                                                            size="small"
                                                            icon={<StorageIcon />}
                                                        />
                                                    )}
                                                    <Tooltip title="Delete file and all versions">
                                                        <IconButton
                                                            color="error"
                                                            size="small"
                                                            onClick={(e) => handleDeleteFile(file, e)}
                                                            disabled={deletingFileId === file.parent_id}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </Box>
                                            
                                            <Divider sx={{ mb: 2 }} />
                                            
                                            <Typography variant="body2" color="text.secondary" mb={1}>
                                                <strong>Columns ({file.column_count}):</strong> {truncateColumns(file.columns)}
                                            </Typography>
                                            
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="body2" color="text.secondary">
                                                    <strong>Created:</strong> {formatDate(file.first_version_created)}
                                                </Typography>
                                                {file.most_recent_version_created && file.most_recent_version_created !== file.first_version_created && (
                                                    <Typography variant="body2" color="text.secondary">
                                                        <strong>Last updated:</strong> {formatDate(file.most_recent_version_created)}
                                                    </Typography>
                                                )}
                                            </Box>
                                            
                                            <Typography variant="body2" color="text.secondary" mb={fileStorage ? 2 : 0}>
                                                <strong>Created by:</strong> {file.first_version_created_by}
                                            </Typography>

                                            {/* Version Details Accordion */}
                                            {fileStorage && fileStorage.versions.length > 0 && (
                                                <Accordion variant="outlined">
                                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                        <Typography variant="body2">
                                                            Version Details ({fileStorage.versions.length} versions)
                                                        </Typography>
                                                    </AccordionSummary>
                                                    <AccordionDetails>
                                                        <List dense>
                                                            {fileStorage.versions.map((version) => (
                                                                <ListItem key={version.version_id}>
                                                                    <ListItemText
                                                                        primary={version.name}
                                                                        secondary={
                                                                            <Box>
                                                                                <Typography variant="caption" display="block">
                                                                                    Size: {version.size.readable}
                                                                                </Typography>
                                                                                <Typography variant="caption" display="block">
                                                                                    Created: {formatDate(version.created_at)}
                                                                                </Typography>
                                                                            </Box>
                                                                        }
                                                                    />
                                                                </ListItem>
                                                            ))}
                                                        </List>
                                                    </AccordionDetails>
                                                </Accordion>
                                            )}
                                        </CardContent>
                                        
                                        <CardActions>
                                            <Button
                                                onClick={() => handleActivateFile(file)}
                                                disabled={file.parent_id === currentParentId || deletingFileId === file.parent_id}
                                                variant={file.parent_id === currentParentId ? "outlined" : "contained"}
                                                startIcon={<HistoryIcon />}
                                            >
                                                {file.parent_id === currentParentId ? "Active" : "Switch to this file"}
                                            </Button>
                                        </CardActions>
                                    </Card>
                                );
                            })}
                        </Box>
                    )}
                </DialogContent>
                
                <DialogActions>
                    <Button onClick={() => setIsDialogOpen(false)}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}; 