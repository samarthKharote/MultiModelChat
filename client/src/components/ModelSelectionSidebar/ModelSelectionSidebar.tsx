import React from 'react';
import {
    styled,
    Paper,
    IconButton,
    Button,
    Slider,
    Typography,
    Tooltip,
    FormControlLabel,
    FormGroup,
    Box,
    Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { LLMModel } from '@/pages/MultiModelChatPage';

const StyledSidebar = styled(Paper)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    width: '280px',
    borderRadius: '0',
    padding: theme.spacing(2),
    gap: theme.spacing(2),
    position: 'fixed',
    left: '0%',
    height: '100%',
    zIndex: theme.zIndex.drawer,
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
    overflowY: 'auto',
    '&::-webkit-scrollbar': {
        width: '8px',
    },
    '&::-webkit-scrollbar-track': {
        backgroundColor: theme.palette.background.default,
    },
    '&::-webkit-scrollbar-thumb': {
        backgroundColor: theme.palette.divider,
        borderRadius: '4px',
        '&:hover': {
            backgroundColor: theme.palette.action.hover,
        },
    },
}));

const StyledButton = styled(IconButton)(() => ({
    marginLeft: 'auto',
}));

const StyledDiv = styled('div')(() => ({
    display: 'flex',
    alignItems: 'center',
}));

const StyledSectionTitle = styled(Typography)(({ theme }) => ({
    fontWeight: 600,
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(1),
}));

export const ModelSelectionSidebar = ({
    availableModels,
    selectedModels,
    setSelectedModels,
    defaultTemperature,
    setDefaultTemperature,
    modelTemperatures,
    setModelTemperatures,
    onClose,
}) => {
    const temperatureTooltipText = `
    This changes the randomness of the LLM's output. 
    The higher the temperature the more creative and imaginative your
    answer will be.
    `;

    return (
        <StyledSidebar>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <StyledSectionTitle variant="subtitle1">
                    Select Models
                </StyledSectionTitle>
                <StyledButton onClick={onClose} size="small">
                    <CloseIcon fontSize="small" />
                </StyledButton>
            </Box>

            <FormGroup>
                {availableModels.map((model: LLMModel) => {
                    const isSelected = selectedModels.some(
                        (m: LLMModel) => m.database_id === model.database_id
                    );
                    return (
                        <FormControlLabel
                            key={model.database_id}
                            control={
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedModels([
                                                ...selectedModels,
                                                model,
                                            ]);
                                        } else {
                                            setSelectedModels(
                                                selectedModels.filter(
                                                    (m: LLMModel) =>
                                                        m.database_id !==
                                                        model.database_id
                                                )
                                            );
                                        }
                                    }}
                                    style={{
                                        width: '18px',
                                        height: '18px',
                                        cursor: 'pointer',
                                    }}
                                />
                            }
                            label={
                                <Typography variant="body2">
                                    {model.database_name || 'Unknown Model'}
                                </Typography>
                            }
                            sx={{ mb: 0.5 }}
                        />
                    );
                })}
            </FormGroup>

            {selectedModels.length === 0 && (
                <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                    Please select at least one model
                </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <StyledDiv>
                <Typography variant="body2">Default Temperature</Typography>
                <Tooltip title={temperatureTooltipText}>
                    <HelpOutlineIcon
                        color="primary"
                        sx={{ fontSize: 14, marginLeft: '5px', cursor: 'help' }}
                    />
                </Tooltip>
            </StyledDiv>

            <Slider
                value={defaultTemperature}
                step={0.1}
                min={0}
                max={1}
                marks
                valueLabelDisplay="auto"
                onChange={(event, newValue) => setDefaultTemperature(newValue as number)}
                sx={{ mb: 2 }}
            />

            {selectedModels.length > 0 && (
                <>
                    <Divider sx={{ my: 2 }} />
                    <StyledSectionTitle variant="subtitle2">
                        Per-Model Temperature (Optional)
                    </StyledSectionTitle>
                    {selectedModels.map((model: LLMModel) => {
                        const modelTemp =
                            modelTemperatures[model.database_id || ''] ??
                            defaultTemperature;
                        return (
                            <Box key={model.database_id} sx={{ mb: 2 }}>
                                <Typography
                                    variant="caption"
                                    sx={{ display: 'block', mb: 0.5 }}
                                >
                                    {model.database_name}
                                </Typography>
                                <Slider
                                    value={modelTemp}
                                    step={0.1}
                                    min={0}
                                    max={1}
                                    marks
                                    valueLabelDisplay="auto"
                                    size="small"
                                    onChange={(event, newValue) => {
                                        setModelTemperatures({
                                            ...modelTemperatures,
                                            [model.database_id || '']: newValue as number,
                                        });
                                    }}
                                />
                            </Box>
                        );
                    })}
                </>
            )}
        </StyledSidebar>
    );
};
