import React from 'react';
import {
    styled,
    Paper,
    Typography,
    Box,
    IconButton,
    CircularProgress,
    Alert,
    Chip,
    Avatar,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Markdown } from '@/components/common';
import { LLMModel } from '@/pages/MultiModelChatPage';

const StyledColumn = styled(Paper)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    height: 'fit-content',
    minWidth: '300px',
    maxWidth: '400px',
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    flexShrink: 0,
}));

const StyledHeader = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
    paddingBottom: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`,
}));

const StyledContent = styled(Box)(({ theme }) => ({
    flex: 1,
    overflowY: 'auto',
    padding: theme.spacing(1),
    minHeight: '200px',
}));

const StyledActions = styled(Box)(({ theme }) => ({
    display: 'flex',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
    paddingTop: theme.spacing(1),
    borderTop: `1px solid ${theme.palette.divider}`,
}));

interface ModelComparisonColumnProps {
    model: LLMModel;
    temperature: number;
    question: string;
    response: string | null;
    isLoading: boolean;
    error: string | null;
    onCopy: () => void;
    onRerun: () => void;
}

export const ModelComparisonColumn: React.FC<ModelComparisonColumnProps> = ({
    model,
    temperature,
    question,
    response,
    isLoading,
    error,
    onCopy,
    onRerun,
}) => {
    const handleCopy = async () => {
        if (response) {
            await navigator.clipboard.writeText(response);
            onCopy();
        }
    };

    return (
        <StyledColumn>
            <StyledHeader>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: '600' }}>
                        {model.database_name || 'Unknown Model'}
                    </Typography>
                    <Chip
                        label={`Temp: ${temperature.toFixed(1)}`}
                        size="small"
                        sx={{ mt: 0.5 }}
                    />
                </Box>
            </StyledHeader>

            {question && (
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', fontSize: '0.75rem' }}>
                        U
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">
                            {question}
                        </Typography>
                    </Box>
                </Box>
            )}

            <StyledContent>
                {isLoading && (
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: '200px',
                        }}
                    >
                        <CircularProgress size={40} />
                        <Typography
                            variant="body2"
                            sx={{ ml: 2, color: 'text.secondary' }}
                        >
                            Generating response...
                        </Typography>
                    </Box>
                )}

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {!isLoading && !error && response && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: 'secondary.main', fontSize: '0.75rem' }}>
                            AI
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Markdown>{response}</Markdown>
                        </Box>
                    </Box>
                )}

                {!isLoading && !error && !response && (
                    <Typography
                        variant="body2"
                        sx={{ color: 'text.secondary', fontStyle: 'italic', textAlign: 'center', py: 4 }}
                    >
                        Waiting for response...
                    </Typography>
                )}
            </StyledContent>

            {(response || error) && (
                <StyledActions>
                    <IconButton
                        size="small"
                        onClick={handleCopy}
                        disabled={!response}
                        title="Copy response"
                    >
                        <ContentCopyIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={onRerun}
                        disabled={isLoading}
                        title="Re-run this model"
                    >
                        <RefreshIcon fontSize="small" />
                    </IconButton>
                </StyledActions>
            )}
        </StyledColumn>
    );
};
