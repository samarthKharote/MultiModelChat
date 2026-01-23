import React from 'react';
import {
    styled,
    Paper,
    IconButton,
    Autocomplete,
    TextField,
    Button,
    Slider,
    Typography,
    Tooltip,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Box,
} from '@mui/material';
import { createFilterOptions } from '@mui/material/Autocomplete';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Model } from '@/pages/ModelPage';

const StyledSidebar = styled(Paper)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    width: '280px',
    borderRadius: '0',
    padding: theme.spacing(2),
    gap: theme.spacing(2),
    [theme.breakpoints.down('md')]: {
        position: 'absolute',
        zIndex: open ? theme.zIndex.drawer + 2 : -1,
        width: '100%',
        maxWidth: '280px',
    },
    position: 'fixed',
    left: '0%',
    height: '100%',
    zIndex: 2,
}));

const StyledButton = styled(IconButton)(() => ({
    marginLeft: 'auto',
}));

const StyledDiv = styled('div')(() => ({
    display: 'flex',
}));

const filter = createFilterOptions();

export const Sidebar = ({
    modelOptions,
    selectedModel,
    setSelectedModel,
    selectedModels,
    setSelectedModels,
    // vectorOptions,
    // selectedVectorDB,
    // setSelectedVectorDB,
    setSideOpen,
    setOpen,
    limit,
    setLimit,
    temperature,
    setTemperature,
    modelTemperatures,
    setModelTemperatures,
}) => {
    const limitTooltipText = `
    This will change the amount of documents pulled from 
    a vector database. Pulling too many documents can potentially cause your engines
    token limit to be exceeded!
    `;

    const temperatureTooltipText = `
    This changes the randomness of the LLM's output. 
    The higher the temperature the more creative and imaginative your
    answer will be.
    `;
    return (
        <StyledSidebar>
            <StyledButton onClick={() => setSideOpen(false)}>
                <CloseIcon />
            </StyledButton>
            <Typography variant="subtitle2" sx={{ fontWeight: '600', mb: 1 }}>
                Select Models (Multiple Selection)
            </Typography>
            <FormGroup>
                {modelOptions.map((model: Model) => {
                    const isSelected = selectedModels.some(
                        (m: Model) => m.database_id === model.database_id
                    );
                    return (
                        <FormControlLabel
                            key={model.database_id}
                            control={
                                <Checkbox
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
                                                    (m: Model) =>
                                                        m.database_id !==
                                                        model.database_id
                                                )
                                            );
                                        }
                                    }}
                                />
                            }
                            label={model.database_name || 'Unknown Model'}
                        />
                    );
                })}
            </FormGroup>
            {selectedModels.length === 0 && (
                <Typography variant="caption" color="error">
                    Please select at least one model
                </Typography>
            )}
            {/* Uncomment the following Autocomplete for vector database selection */}
            {/* <Autocomplete
                disableClearable
                freeSolo
                options={vectorOptions}
                value={selectedVectorDB}
                filterOptions={(options, params) => {
                    const filtered = filter(options, params);
                    const { inputValue } = params;
                    // Suggest the creation of a new value
                    const isExisting = options.some(
                        (option) => inputValue === option.database_name,
                    );
                    if (inputValue !== '' && !isExisting) {
                        filtered.push({
                            inputValue,
                        });
                    }

                    return filtered;
                }}
                getOptionLabel={(option) => {
                    if (typeof option === 'string') {
                        return option;
                    }

                    if (option?.inputValue) {
                        return option.inputValue;
                    }

                    return option.database_name;
                }}
                onChange={(event, newVectorDB) =>
                    setSelectedVectorDB(newVectorDB)
                }
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Vector Database"
                        variant="standard"
                    />
                )}
            /> */}
            <StyledDiv style={{ display: 'flex' }}>
                <Typography>Number of Results Queried</Typography>
                <Tooltip title={limitTooltipText}>
                    <HelpOutlineIcon
                        color="primary"
                        sx={{ fontSize: 15, marginLeft: '5px' }}
                    />
                </Tooltip>
            </StyledDiv>

            {/* <Slider
                value={limit}
                step={1}
                min={1}
                max={10}
                marks
                valueLabelDisplay="auto"
                onChange={(event, newValue) => setLimit(newValue)}
            /> */}

            <StyledDiv>
                <Typography>Default Temperature</Typography>
                <Tooltip title={temperatureTooltipText}>
                    <HelpOutlineIcon
                        color="primary"
                        sx={{ fontSize: 15, marginLeft: '5px' }}
                    />
                </Tooltip>
            </StyledDiv>

            <Slider
                value={temperature}
                step={0.1}
                min={0}
                max={1}
                marks
                valueLabelDisplay="auto"
                onChange={(event, newValue) => setTemperature(newValue)}
            />
            
            {selectedModels.length > 0 && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: '600', mb: 1 }}>
                        Per-Model Temperature (Optional)
                    </Typography>
                    {selectedModels.map((model: Model) => {
                        const modelTemp = modelTemperatures[model.database_id || ''] ?? temperature;
                        return (
                            <Box key={model.database_id} sx={{ mb: 2 }}>
                                <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
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
                </Box>
            )}

            {/* <Button variant="contained" onClick={() => setOpen(true)}>
                Add a New Knowledge Repository
            </Button> */}
        </StyledSidebar>
    );
};
