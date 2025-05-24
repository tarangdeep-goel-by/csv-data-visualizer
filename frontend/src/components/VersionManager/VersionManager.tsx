import React, { useState } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton } from '@mui/material';
import { Save as SaveIcon, Delete as DeleteIcon, History as HistoryIcon } from '@mui/icons-material';
import { Version } from './types';

interface VersionManagerProps {
    onSaveVersion: (name: string, description: string) => Promise<void>;
    onLoadVersion: (versionId: string) => Promise<void>;
    onDeleteVersion: (versionId: string) => Promise<void>;
    versions: Version[];
    currentVersionId: string | null;
}

export const VersionManager: React.FC<VersionManagerProps> = ({
    onSaveVersion,
    onLoadVersion,
    onDeleteVersion,
    versions,
    currentVersionId
}) => {
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [versionName, setVersionName] = useState('');
    const [versionDescription, setVersionDescription] = useState('');

    const handleSaveClick = () => {
        setIsSaveDialogOpen(true);
    };

    const handleHistoryClick = () => {
        setIsHistoryDialogOpen(true);
    };

    const handleSave = async () => {
        await onSaveVersion(versionName, versionDescription);
        setVersionName('');
        setVersionDescription('');
        setIsSaveDialogOpen(false);
    };

    const handleLoad = async (versionId: string) => {
        await onLoadVersion(versionId);
        setIsHistoryDialogOpen(false);
    };

    const handleDelete = async (versionId: string) => {
        await onDeleteVersion(versionId);
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
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Version History</DialogTitle>
                <DialogContent>
                    <List>
                        {versions.map((version) => (
                            <ListItem 
                                key={version.id}
                                sx={{
                                    backgroundColor: version.id === currentVersionId ? 'action.selected' : 'inherit'
                                }}
                            >
                                <ListItemText
                                    primary={
                                        <div style={{ 
                                            display: 'flex', 
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            {version.name}
                                            {version.id === currentVersionId && 
                                                <span style={{ 
                                                    fontSize: '0.75rem',
                                                    color: 'text.secondary'
                                                }}>
                                                    (Current)
                                                </span>
                                            }
                                        </div>
                                    }
                                    secondary={
                                        <>
                                            {version.description && <div>{version.description}</div>}
                                            <div>Created: {new Date(version.created_at).toLocaleString()}</div>
                                        </>
                                    }
                                />
                                <ListItemSecondaryAction>
                                    <IconButton 
                                        edge="end" 
                                        onClick={() => handleDelete(version.id)}
                                        disabled={version.id === currentVersionId}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                    <Button
                                        onClick={() => handleLoad(version.id)}
                                        disabled={version.id === currentVersionId}
                                    >
                                        Load
                                    </Button>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsHistoryDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}; 