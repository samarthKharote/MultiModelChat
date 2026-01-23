import React, { useState, useEffect, useRef } from 'react';
import {
    styled,
    Box,
    Container,
    Avatar,
    CircularProgress,
    Typography,
    Button,
    IconButton,
    TextField,
    Autocomplete,
} from '@mui/material';
import { FileUploadOutlined } from '@mui/icons-material';
import { createFilterOptions } from '@mui/material/Autocomplete';
import Dropzone from 'react-dropzone';
import { useInsight } from '@semoss/sdk-react';

import CloseIcon from '@mui/icons-material/Close';

interface GetInputPropsOptionsRef {
    ref?: React.RefObject<HTMLInputElement>;
}

const filter = createFilterOptions();

const StyledModal = styled(Box)(({ theme }) => ({
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '600px',
    backgroundColor: theme.palette.background.paper,
    borderRadius: '30px',
    boxShadow: '24',
    p: '4',
    padding: theme.spacing(4),
}));

const StyledLoadingDiv = styled('div')(() => ({
    display: 'flex',
    flexDirection: 'column',
    justifyItems: 'center',
    alignItems: 'center',
}));

const StyledTypography = styled(Typography)(({ theme }) => ({
    marginTop: theme.spacing(4),
}));

const StyledButtonGroup = styled('div')(() => ({
    display: 'flex',
    justifyContent: 'flex-end',
}));

const StyledTitle = styled(Typography)(({ theme }) => ({
    color: theme.palette.primary.main,
    alignItems: 'center',
    marginTop: theme.spacing(3),
}));

const StyledButton = styled(Button)(({ theme }) => ({
    marginRight: theme.spacing(0.5),
}));

const StyledAutocomplete = styled(Autocomplete)(({ theme }) => ({
    margin: theme.spacing(3),
}));

const StyledLink = styled('button')(({ theme }) => ({
    display: 'inline-block',
    color: theme.palette.primary.main,
    cursor: 'pointer',
    backgroundColor: theme.palette.background.paper,
    border: '0px',
}));

const ENCODER_OPTIONS = ['FAISS', 'Weaviate', 'Pinecone', 'pgvector'];

export const VectorModal = ({
    setOpen,
    open,
    vectorOptions,
    setRefresh,
    setSelectedVectorDB,
    selectedVectorDB,
    setError,
}) => {
    const [newVector, setNewVectorDB] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [file, setFile] = useState<File | null>(null);
    const { actions } = useInsight();

    const [fileError, setFileError] = useState<string | null>(null);

    const fileInput = useRef<HTMLInputElement>();

    useEffect(() => {
        setNewVectorDB(null);
    }, [open]);

    const closingFunctions = () => {
        setLoading(false);
        setRefresh(true);
        setOpen(false);
        setNewVectorDB(null);
        setFile(null);
    };

    const handleSubmit = async () => {
        setLoading(true);
        let engine;
        if (newVector) {
            try {
                const pixel = `CreateVectorDatabaseEngine ( database = [ "${newVector}" ] , conDetails = [ { "VECTOR_TYPE" : "FAISS" , "NAME" : "${newVector}" , "CONNECTION_URL" : "@BaseFolder@/vector/@ENGINE@/" , "ENCODER_NAME" : "BAAI/bge-large-en-v1.5" , "ENCODER_TYPE" : "huggingface" } ] ) ;`;
                const response = await actions.run(pixel);
                const { output, operationType } = response.pixelReturn[0];
                engine = output;
                if (operationType.indexOf('ERROR') > -1) {
                    throw new Error(output as string);
                }
            } catch (e) {
                if (e.message) {
                    setError(e.message);
                } else {
                    console.log(e);
                    setError(
                        'There was an error creating your vector DB, please check pixel calls',
                    );
                }
            } finally {
                closingFunctions();
            }
        }

        if (file) {
            try {
                const fileUpload = await actions.upload(file, '');
                const { fileLocation } = fileUpload[0];
                const embedEngine = engine || selectedVectorDB;
                const pixel = `
                CreateEmbeddingsFromDocuments ( engine = "${
                    embedEngine.database_id
                }" , filePaths = [ "${fileLocation.slice(1)}" ] ) ;
                `;
                await actions.run(pixel).then((response) => {
                    const { output, operationType } = response.pixelReturn[0];
                    console.log(operationType.indexOf('ERROR'));
                    if (operationType.indexOf('ERROR') > -1) {
                        throw new Error(output as string);
                    }
                });
            } catch (e) {
                if (e.message) {
                    setError(e.message);
                } else {
                    setError(
                        'There was an error embedding your document, please check pixel calls',
                    );
                }
            } finally {
                closingFunctions();
            }
        }
    };

    const firstStep = () => {
        return (
            <>
                <StyledButtonGroup>
                    <IconButton onClick={() => setOpen(false)}>
                        {' '}
                        <CloseIcon />
                    </IconButton>
                </StyledButtonGroup>
                <StyledTitle variant="h6">
                    Step 1: Name a Knowledge Repository
                </StyledTitle>
                <Typography variant="caption">
                    Create or select a Vector Database to embed your documents
                    in. If creating a new Database, make sure to select Add
                    *database name*
                </Typography>
                <StyledAutocomplete
                    freeSolo
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                    options={vectorOptions}
                    value={selectedVectorDB}
                    filterOptions={(options, params) => {
                        const filtered = filter(options, params);

                        if (params.inputValue !== '') {
                            filtered.push({
                                inputValue: params.inputValue,
                                database_name: `Add "${params.inputValue}"`,
                            });
                        }
                        return filtered;
                    }}
                    getOptionLabel={(option: any) => {
                        if (typeof option === 'string') {
                            return option;
                        }

                        if (option?.inputValue) {
                            return option.inputValue;
                        }

                        return option.database_name;
                    }}
                    renderOption={(props, option: any) => (
                        <li {...props}>{option.database_name}</li>
                    )}
                    onChange={(event, newVectorDB: any) => {
                        if (newVectorDB.inputValue) {
                            setNewVectorDB(newVectorDB.inputValue);
                        }
                        setSelectedVectorDB(newVectorDB);
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Vector Database"
                            variant="standard"
                        />
                    )}
                />

                <StyledTitle variant="h6">Step 2: Select Type</StyledTitle>
                <StyledTypography variant="caption">
                    Select an encoder to use
                </StyledTypography>

                <StyledAutocomplete
                    disableClearable
                    options={ENCODER_OPTIONS}
                    value={ENCODER_OPTIONS[0]}
                    getOptionLabel={(option: string) => option}
                    getOptionDisabled={(option) => option !== 'FAISS'}
                    renderInput={(params) => (
                        <TextField {...params} variant="standard" />
                    )}
                />

                <StyledTitle variant="h6">
                    Step 3: Document(s) to embed
                </StyledTitle>
                <Typography variant="caption">
                    Drag and Drop .csv or .pdf files to embed your vector db
                </Typography>
                <Dropzone
                    accept={{ 'text/pdf': ['.pdf'], 'text/csv': ['.csv'] }}
                    onDrop={(acceptedFiles, fileRejections) => {
                        if (fileRejections.length > 0) {
                            setFileError(fileRejections[0].errors[0].message);
                        } else {
                            setFile(acceptedFiles[0]);
                            setFileError(null);
                        }
                    }}
                >
                    {({ getRootProps, getInputProps }) => (
                        <Container
                            maxWidth="lg"
                            sx={{
                                backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='16' ry='16' stroke='%23333' stroke-width='1' stroke-dasharray='6%2c 14' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e")`,
                                borderRadius: '16px',
                                borderColor: 'rgba(0,0,0,0.23)',
                                marginTop: '16px',
                                marginBottom: '16px',
                            }}
                        >
                            <div
                                style={{
                                    paddingTop: '36px',
                                    paddingBottom: '36px',
                                }}
                                {...getRootProps({ className: 'dropzone' })}
                            >
                                <input
                                    accept=".pdf, .csv"
                                    {...(getInputProps() as GetInputPropsOptionsRef)}
                                    onClick={(e) => e.stopPropagation()}
                                />

                                <label>
                                    <TextField
                                        variant="outlined"
                                        type="text"
                                        sx={{ display: 'none' }}
                                        InputProps={{
                                            endAdornment: (
                                                <IconButton>
                                                    <FileUploadOutlined />
                                                    <input
                                                        ref={fileInput}
                                                        style={{
                                                            display: 'none',
                                                        }}
                                                        type="file"
                                                        hidden
                                                        name="[licenseFile]"
                                                    />
                                                </IconButton>
                                            ),
                                        }}
                                    />
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Avatar
                                            sx={{
                                                bgcolor: '#E1F5FE',
                                                marginRight: '16px',
                                            }}
                                        >
                                            <FileUploadOutlined
                                                sx={{ color: '#40a0ff' }}
                                            />
                                        </Avatar>
                                        <span>
                                            {
                                                <StyledLink>
                                                    Click to Upload
                                                </StyledLink>
                                            }
                                            &nbsp;or drag and drop
                                            <Typography variant="subtitle2">
                                                Maximum File size 100MB.
                                            </Typography>
                                        </span>
                                    </Typography>
                                </label>
                            </div>
                        </Container>
                    )}
                </Dropzone>
                <Typography variant="caption">
                    {file?.name}
                    {fileError}
                </Typography>
                <StyledButtonGroup>
                    <StyledButton
                        variant="contained"
                        color="primary"
                        onClick={() => setOpen(false)}
                    >
                        {' '}
                        Close{' '}
                    </StyledButton>
                    <StyledButton
                        variant="outlined"
                        disabled={!file?.name && !newVector}
                        onClick={handleSubmit}
                    >
                        {' '}
                        Finish{' '}
                    </StyledButton>
                </StyledButtonGroup>
            </>
        );
    };

    return (
        <StyledModal>
            {loading ? (
                <StyledLoadingDiv>
                    <CircularProgress />
                    <StyledTypography>
                        Embedding may take a while, thank you for your patience
                    </StyledTypography>
                </StyledLoadingDiv>
            ) : (
                firstStep()
            )}
        </StyledModal>
    );
};
