import React, { useState } from 'react';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Typography,
    Box,
    Chip
} from '@mui/material';
import {
    Save as SaveIcon,
    History as HistoryIcon,
    Delete as DeleteIcon,
    Storage as StorageIcon
} from '@mui/icons-material';
import { api } from '../../utils/api';
import type { Version } from './types';

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

interface VersionManagerProps {
    onSaveVersion: (name: string, description: string) => Promise<void>;
    onLoadVersion: (versionId: string) => Promise<void>;
    onDeleteVersion: (versionId: string) => Promise<void>;
    versions: Version[];
    currentVersionId: string | null;
    currentParentId: string | null;
}

export const VersionManager: React.FC<VersionManagerProps> = ({
    onSaveVersion,
    onLoadVersion,
    onDeleteVersion,
    versions,
    currentVersionId,
    currentParentId
}) => {
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [versionName, setVersionName] = useState('');
    const [versionDescription, setVersionDescription] = useState('');
    const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);

    const fetchStorageUsage = async () => {
        try {
            const response = await api.get('storage/usage');
            setStorageUsage(response.data);
        } catch (err) {
            console.error('Error fetching storage usage:', err);
        }
    };

    const handleSaveClick = () => {
        setIsSaveDialogOpen(true);
    };

    const handleHistoryClick = () => {
        setIsHistoryDialogOpen(true);
        fetchStorageUsage();
    };

    const handleSave = async () => {
        await onSaveVersion(versionName, versionDescription);
        setVersionName('');
        setVersionDescription('');
        setIsSaveDialogOpen(false);
        // Refresh storage usage after saving
        if (isHistoryDialogOpen) {
            fetchStorageUsage();
        }
    };

    const handleLoad = async (versionId: string) => {
        await onLoadVersion(versionId);
        setIsHistoryDialogOpen(false);
    };

    const handleDelete = async (versionId: string) => {
        await onDeleteVersion(versionId);
        // Refresh storage usage after deletion
        fetchStorageUsage();
    };

    return (
        <div style={{ display: 'flex', gap: '8px', padding: '8px' }}>
            {/* Save Version Button */}
            <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveClick}
            >
                Save Version
            </Button>

            {/* History Button */}
            <Button
                variant="outlined"
                startIcon={<HistoryIcon />}
                onClick={handleHistoryClick}
            >
                Version History
            </Button>

            {/* Save Version Dialog */}
            <Dialog open={isSaveDialogOpen} onClose={() => setIsSaveDialogOpen(false)}>
                <DialogTitle>Save Current Version</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Version Name"
                        fullWidth
                        value={versionName}
                        onChange={(e) => setVersionName(e.target.value)}
                    />
                    <TextField
                        margin="dense"
                        label="Description"
                        fullWidth
                        multiline
                        rows={2}
                        value={versionDescription}
                        onChange={(e) => setVersionDescription(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsSaveDialogOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={handleSave}
                        disabled={!versionName.trim()}
                        variant="contained"
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Version History Dialog */}
            <Dialog 
                open={isHistoryDialogOpen} 
                onClose={() => setIsHistoryDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Version History</DialogTitle>
                <DialogContent>
                    <List>
                        {versions.map((version) => {
                            const versionStorage = storageUsage?.file_breakdown[currentParentId || '']?.versions.find(
                                v => v.version_id === version.id
                            );
                            
                            return (
                                <ListItem 
                                    key={version.id}
                                    sx={{
                                        backgroundColor: version.id === currentVersionId ? 'action.selected' : 'inherit',
                                        mb: 1,
                                        border: 1,
                                        borderColor: 'divider',
                                        borderRadius: 1
                                    }}
                                >
                                    <ListItemText
                                        primary={
                                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                                <Typography variant="subtitle1">
                                                    {version.name}
                                                </Typography>
                                                {version.id === currentVersionId && (
                                                    <Chip
                                                        label="Current"
                                                        color="primary"
                                                        size="small"
                                                    />
                                                )}
                                                {versionStorage && (
                                                    <Chip
                                                        label={versionStorage.size.readable}
                                                        color="default"
                                                        size="small"
                                                        icon={<StorageIcon />}
                                                    />
                                                )}
                                            </Box>
                                        }
                                        secondary={
                                            <Box>
                                                {version.description && (
                                                    <Typography variant="body2" color="text.secondary" mb={1}>
                                                        {version.description}
                                                    </Typography>
                                                )}
                                                <Typography variant="caption" color="text.secondary">
                                                    Created: {new Date(version.created_at).toLocaleString()}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                    <ListItemSecondaryAction>
                                        <Box display="flex" gap={1}>
                                            <IconButton 
                                                edge="end" 
                                                onClick={() => handleDelete(version.id)}
                                                disabled={version.id === currentVersionId}
                                                size="small"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                            <Button
                                                onClick={() => handleLoad(version.id)}
                                                disabled={version.id === currentVersionId}
                                                size="small"
                                                variant="outlined"
                                            >
                                                Load
                                            </Button>
                                        </Box>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            );
                        })}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsHistoryDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}; 