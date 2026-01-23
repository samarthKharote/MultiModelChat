import { useEffect, useState } from 'react';
import {
    styled,
    Alert,
    Box,
    Button,
    Stack,
    LinearProgress,
    TextField,
    Typography,
    Paper,
    Modal,
    IconButton,
    Snackbar,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useInsight } from '@semoss/sdk-react';
import { Sidebar } from '../components/Sidebar';
import { VectorModal } from '../components/VectorModal';
import { ModelComparisonColumn } from '../components/ModelComparisonColumn';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { Markdown } from '@/components/common';

const StyledContainer = styled('div')(({ theme }) => ({
    padding: `${theme.spacing(4)} ${theme.spacing(2)} ${theme.spacing(
        4,
    )} 280px`,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
}));

const StyledComparisonContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    gap: theme.spacing(2),
    overflowX: 'auto',
    padding: theme.spacing(2),
    minHeight: '600px',
    width: '100%',
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(4),
    width: '100%',
}));

const StyledLayout = styled(Stack)(() => ({
    display: 'flex',
    flexDirection: 'row',
}));

const StyledButton = styled(IconButton)(() => ({
    position: 'fixed',
    left: '0%',
    marginRight: 'auto',
}));

export interface Model {
    database_name?: string;
    database_id?: string;
}

export interface VectorContext {
    score: string;
    doc_index: string;
    tokens: string;
    content: string;
    url: string;
}

interface ModelResponse {
    model: Model;
    response: string | null;
    isLoading: boolean;
    error: string | null;
}

export const ModelPage = () => {
    const { actions } = useInsight();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isAnswered, setIsAnswered] = useState(false);
    const [showContext, setShowContext] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    
    //From the LLM (legacy single response)
    const [answer, setAnswer] = useState({
        question: '',
        conclusion: '',
    });
    
    // Model Catalog and selected models
    const [modelOptions, setModelOptions] = useState<Model[]>([]);
    const [selectedModel, setSelectedModel] = useState<Model>({}); // Legacy, kept for compatibility
    const [selectedModels, setSelectedModels] = useState<Model[]>([]);
    
    // Model responses for comparison
    const [modelResponses, setModelResponses] = useState<Record<string, ModelResponse>>({});

    // Vector DB catalog and first vector DB in dropdown
    // const [vectorOptions, setVectorOptions] = useState([]);
    // const [selectedVectorDB, setSelectedVectorDB] = useState<Model>({});
    //Controlling the modal
    const [open, setOpen] = useState<boolean>(false);
    const [refresh, setRefresh] = useState<boolean>(false);

    //Controlling the Sidebar
    const [sideOpen, setSideOpen] = useState<boolean>(true);
    const [urls, setUrls] = useState([]);
    const { control, handleSubmit } = useForm({
        defaultValues: {
            QUESTION: '',
        },
    });

    const [limit, setLimit] = useState<number>(3);
    const [temperature, setTemperature] = useState<number>(0);
    const [modelTemperatures, setModelTemperatures] = useState<Record<string, number>>({});
    const [currentQuestion, setCurrentQuestion] = useState<string>('');
    /**
     * Execute a single model query
     */
    const executeModelQuery = async (
        model: Model,
        question: string,
        temp: number
    ): Promise<string> => {
        const pixel = `LLM(engine="${model.database_id}" , command=["${question}"], paramValues=[temperature=${temp}])`;
        
        const LLMresponse = await actions.run<[{ response: string }]>(pixel);
        const { output: LLMOutput, operationType: LLMOperationType } =
            LLMresponse.pixelReturn[0];

        if (LLMOperationType.indexOf('ERROR') > -1) {
            throw new Error(
                typeof LLMOutput === 'string'
                    ? LLMOutput
                    : LLMOutput?.response || 'Unknown error'
            );
        }

        return LLMOutput?.response || '';
    };

    /**
     * Allow the user to ask a question - now supports multiple models
     */
    const ask = handleSubmit(async (data: { QUESTION: string }) => {
        try {
            setError('');
            setIsAnswered(false);

            if (!data.QUESTION) {
                throw new Error('Question is required');
            }

            if (selectedModels.length === 0) {
                throw new Error('Please select at least one model');
            }

            // Store the current question
            setCurrentQuestion(data.QUESTION);

            // Initialize responses for all selected models
            const initialResponses: Record<string, ModelResponse> = {};
            selectedModels.forEach((model) => {
                initialResponses[model.database_id || ''] = {
                    model,
                    response: null,
                    isLoading: true,
                    error: null,
                };
            });
            setModelResponses(initialResponses);
            setIsLoading(true);

            // Execute all models in parallel
            const promises = selectedModels.map(async (model) => {
                const modelId = model.database_id || '';
                const modelTemp =
                    modelTemperatures[modelId] ?? temperature;

                try {
                    const response = await executeModelQuery(
                        model,
                        data.QUESTION,
                        modelTemp
                    );

                    setModelResponses((prev) => ({
                        ...prev,
                        [modelId]: {
                            model,
                            response,
                            isLoading: false,
                            error: null,
                        },
                    }));
                } catch (err) {
                    const errorMessage =
                        err instanceof Error ? err.message : 'Unknown error';
                    setModelResponses((prev) => ({
                        ...prev,
                        [modelId]: {
                            model,
                            response: null,
                            isLoading: false,
                            error: errorMessage,
                        },
                    }));
                }
            });

            await Promise.all(promises);
            setIsAnswered(true);
        } catch (e) {
            const errorMessage =
                e instanceof Error ? e.message : 'There is an error, please check pixel calls';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    });

    /**
     * Re-run a specific model
     */
    const rerunModel = async (model: Model, question: string) => {
        const modelId = model.database_id || '';
        const modelTemp = modelTemperatures[modelId] ?? temperature;

        setModelResponses((prev) => ({
            ...prev,
            [modelId]: {
                ...prev[modelId],
                isLoading: true,
                error: null,
            },
        }));

        try {
            const response = await executeModelQuery(model, question, modelTemp);
            setModelResponses((prev) => ({
                ...prev,
                [modelId]: {
                    model,
                    response,
                    isLoading: false,
                    error: null,
                },
            }));
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Unknown error';
            setModelResponses((prev) => ({
                ...prev,
                [modelId]: {
                    model,
                    response: null,
                    isLoading: false,
                    error: errorMessage,
                },
            }));
        }
    };

    useEffect(() => {
        setIsLoading(true);
        //Grabbing all the Models that are in CfG
        let pixel = `MyEngines ( engineTypes=["MODEL"]);`;

        actions.run(pixel).then((response) => {
            const { output, operationType } = response.pixelReturn[0];

            if (operationType.indexOf('ERROR') > -1) {
                throw new Error(output as string);
            }
            if (Array.isArray(output)) {
                setModelOptions(output);
                setSelectedModel(output[0]);
                // Initialize with first model selected
                if (selectedModels.length === 0 && output.length > 0) {
                    setSelectedModels([output[0]]);
                }
            }
        });
        //Grabbing all the Vector Databases in CfG
        // pixel = `MyEngines ( engineTypes=["VECTOR"]);`;

        // actions.run(pixel).then((response) => {
        //     const { output, operationType } = response.pixelReturn[0];

        //     if (operationType.indexOf('ERROR') > -1) {
        //         throw new Error(output as string);
        //     }
        //     if (Array.isArray(output)) {
        //         setVectorOptions(output);
        //         setSelectedVectorDB(output[0]);
        //     }
        // });

        setIsLoading(false);
    }, []);

    // Clean up responses when models are deselected
    useEffect(() => {
        const selectedModelIds = new Set(
            selectedModels.map((m) => m.database_id || '')
        );
        setModelResponses((prev) => {
            const cleaned: Record<string, ModelResponse> = {};
            Object.keys(prev).forEach((modelId) => {
                if (selectedModelIds.has(modelId)) {
                    cleaned[modelId] = prev[modelId];
                }
            });
            return cleaned;
        });
    }, [selectedModels]);

    //Uncomment the following useEffect to fetch vector options after a refresh
    // useEffect(() => {
    //     const pixel = `MyEngines ( engineTypes=["VECTOR"]);`;

    //     actions.run(pixel).then((response) => {
    //         const { output, operationType } = response.pixelReturn[0];
    //         if (operationType.indexOf('ERROR') > -1) {
    //             throw new Error(output as string);
    //         }
    //         if (Array.isArray(output)) {
    //             setVectorOptions(output);
    //             setSelectedVectorDB(output[0]);
    //             setRefresh(false);
    //         }
    //     });
    // }, [refresh]);

    return (
        <StyledLayout justifyContent={'center'}>
            <Stack>
                {sideOpen ? (
                    <Sidebar
                        modelOptions={modelOptions}
                        selectedModel={selectedModel}
                        setSelectedModel={setSelectedModel}
                        selectedModels={selectedModels}
                        setSelectedModels={setSelectedModels}
                        // vectorOptions={vectorOptions}
                        // selectedVectorDB={selectedVectorDB}
                        // setSelectedVectorDB={setSelectedVectorDB}
                        setSideOpen={setSideOpen}
                        setOpen={setOpen}
                        limit={limit}
                        setLimit={setLimit}
                        temperature={temperature}
                        setTemperature={setTemperature}
                        modelTemperatures={modelTemperatures}
                        setModelTemperatures={setModelTemperatures}
                    />
                ) : (
                    <StyledButton onClick={() => setSideOpen(!sideOpen)}>
                        <ArrowForwardIosIcon />
                    </StyledButton>
                )}
                <StyledContainer>
                    <StyledPaper variant={'elevation'} elevation={2} square>
                        <Stack spacing={2}>
                            <Typography variant="h5">AskMe.AI</Typography>
                            <Typography variant="body1">
                                Assists users in answering complex policy,
                                operational procedure, and system questions.
                                This engine takes data such as policy manuals,
                                system documents, process maps, data from case
                                databases as inputs, and uses LLM models to
                                provide answers. Compare responses from multiple
                                LLM models side by side.
                            </Typography>
                            {error && <Alert color="error">{error}</Alert>}
                            <Controller
                                name={'QUESTION'}
                                control={control}
                                rules={{ required: true }}
                                render={({ field }) => {
                                    return (
                                        <TextField
                                            label="Enter Question:"
                                            variant="outlined"
                                            fullWidth
                                            value={
                                                field.value ? field.value : ''
                                            }
                                            onChange={(e) =>
                                                field.onChange(e.target.value)
                                            }
                                            multiline
                                            rows={4}
                                        />
                                    );
                                }}
                            />
                            <Stack
                                flexDirection={'row'}
                                alignItems={'center'}
                                justifyContent={'center'}
                                gap={1}
                            >
                                <Button
                                    variant="contained"
                                    disabled={isLoading || selectedModels.length === 0}
                                    onClick={ask}
                                    sx={{ flex: 1, width: '85%' }}
                                >
                                    {isLoading ? 'Generating Answers...' : 'Generate Answer'}
                                </Button>
                            </Stack>
                            {selectedModels.length === 0 && (
                                <Alert severity="info">
                                    Please select at least one model from the sidebar to compare responses.
                                </Alert>
                            )}
                        </Stack>
                    </StyledPaper>
                    {isLoading && <LinearProgress />}
                    
                    {isAnswered && selectedModels.length > 0 && (
                        <StyledComparisonContainer>
                            {selectedModels.map((model) => {
                                const modelId = model.database_id || '';
                                const modelResponse = modelResponses[modelId] || {
                                    model,
                                    response: null,
                                    isLoading: false,
                                    error: null,
                                };
                                const modelTemp = modelTemperatures[modelId] ?? temperature;
                                const question = currentQuestion;

                                return (
                                    <ModelComparisonColumn
                                        key={modelId}
                                        model={model}
                                        temperature={modelTemp}
                                        question={question}
                                        response={modelResponse.response}
                                        isLoading={modelResponse.isLoading}
                                        error={modelResponse.error}
                                        onCopy={() => setCopySuccess(true)}
                                        onRerun={() => rerunModel(model, question)}
                                    />
                                );
                            })}
                        </StyledComparisonContainer>
                    )}
                </StyledContainer>
                <Snackbar
                    open={copySuccess}
                    autoHideDuration={2000}
                    onClose={() => setCopySuccess(false)}
                    message="Response copied to clipboard!"
                />
            </Stack>
            {/* Uncomment when adding in vector functionality */}
            {/* <Modal open={open} onClose={() => setOpen(false)}>
                <VectorModal
                    setOpen={setOpen}
                    open={open}
                    vectorOptions={vectorOptions}
                    setRefresh={setRefresh}
                    setSelectedVectorDB={setSelectedVectorDB}
                    selectedVectorDB={selectedVectorDB}
                    setError={setError}
                />
            </Modal> */}
        </StyledLayout>
    );
};
