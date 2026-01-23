import { useEffect, useMemo, useRef, useState } from 'react';
import {
    styled,
    Alert,
    Box,
    Button,
    Stack,
    TextField,
    Typography,
    IconButton,
    Snackbar,
    AppBar,
    Toolbar,
    Avatar,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useInsight } from '@semoss/sdk-react';
import { ModelSelectionSidebar } from '../components/ModelSelectionSidebar';
import { ModelComparisonColumn } from '../components/ModelComparisonColumn';
import SendIcon from '@mui/icons-material/Send';
import MenuIcon from '@mui/icons-material/Menu';
import StopIcon from '@mui/icons-material/Stop';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import logoIcon from '@/assets/img/multichatbot-logo.svg';
import ChatbotLogo from '@/assets/img/chatbot.jpg';

const StyledMainContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: theme.palette.background.default,
    overflow: 'hidden',
}));

const StyledTopBar = styled(AppBar)(({ theme }) => ({
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
    boxShadow: 'none',
    zIndex: theme.zIndex.drawer + 1,
}));

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    padding: `${theme.spacing(1.5)} ${theme.spacing(3)}`,
}));

const StyledLogo = styled('img')({
    height: '32px',
    width: 'auto',
});

const StyledContentArea = styled(Box)(({ theme }) => ({
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
}));

const StyledComparisonContainer = styled(Box)(({ theme }) => ({
    flex: 1,
    display: 'flex',
    overflowX: 'auto',
    overflowY: 'auto',
    padding: theme.spacing(3),
    marginLeft: '280px',
    // “Scrollable right-to-left” while keeping each panel’s text normal.
    direction: 'rtl',
    '&::-webkit-scrollbar': {
        height: '8px',
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

const StyledPanelsRow = styled(Box)(({ theme }) => ({
    display: 'flex',
    gap: theme.spacing(2),
    direction: 'ltr',
    width: 'fit-content',
}));

const StyledInputContainer = styled(Box)(({ theme }) => ({
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.palette.background.paper,
    borderTop: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(2),
    paddingLeft: `calc(280px + ${theme.spacing(2)})`,
    zIndex: theme.zIndex.drawer + 1,
}));

const StyledInputWrapper = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'flex-end',
    gap: theme.spacing(1),
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(1.5),
    border: `1px solid ${theme.palette.divider}`,
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
    flex: 1,
    '& .MuiOutlinedInput-root': {
        backgroundColor: 'transparent',
        color: theme.palette.text.primary,
        '& fieldset': {
            borderColor: 'transparent',
        },
        '&:hover fieldset': {
            borderColor: 'transparent',
        },
        '&.Mui-focused fieldset': {
            borderColor: theme.palette.primary.main,
        },
    },
    '& .MuiInputLabel-root': {
        color: theme.palette.text.secondary,
    },
}));

const StyledSendButton = styled(IconButton)(({ theme }) => ({
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    '&:hover': {
        backgroundColor: theme.palette.primary.dark,
    },
    '&:disabled': {
        backgroundColor: theme.palette.action.disabledBackground,
        color: theme.palette.action.disabled,
    },
}));

export interface LLMModel {
    database_name?: string;
    database_id?: string;
}

interface ModelResponse {
    model: LLMModel;
    response: string | null;
    isLoading: boolean;
    error: string | null;
}

interface BestResponseState {
    response: string | null;
    isLoading: boolean;
    error: string | null;
}

interface ChatTurn {
    id: string;
    message: string;
    createdAt: number;
    selectedModels: LLMModel[];
    defaultTemperatureSnapshot: number;
    modelTemperaturesSnapshot: Record<string, number>;
    modelResponses: Record<string, ModelResponse>;
    isGenerating: boolean;
    best: BestResponseState;
}

export const MultiModelChatPage = () => {
    const { actions } = useInsight();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Model Catalog and selected models
    const [availableModels, setAvailableModels] = useState<LLMModel[]>([]);
    const [selectedModels, setSelectedModels] = useState<LLMModel[]>([]);

    // Model responses for comparison
    const [turns, setTurns] = useState<ChatTurn[]>([]);
    const runIdRef = useRef(0);
    const isAnyGenerating = useMemo(
        () => turns.some((t) => t.isGenerating),
        [turns]
    );

    const { control, handleSubmit, reset } = useForm({
        defaultValues: {
            MESSAGE: '',
        },
    });

    const [defaultTemperature, setDefaultTemperature] = useState<number>(0);
    const [modelTemperatures, setModelTemperatures] = useState<Record<string, number>>({});

    const buildTurnId = () =>
        `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const createInitialResponses = (
        models: LLMModel[]
    ): Record<string, ModelResponse> => {
        const initial: Record<string, ModelResponse> = {};
        models.forEach((model) => {
            const modelId = model.database_id || '';
            if (!modelId) return;
            initial[modelId] = {
                model,
                response: null,
                isLoading: true,
                error: null,
            };
        });
        return initial;
    };

    const stopAllGeneration = () => {
        // `actions.run` isn't abortable here; we mark turns stopped and ignore late arrivals.
        runIdRef.current += 1;
        setTurns((prev) =>
            prev.map((t) =>
                t.isGenerating
                    ? {
                          ...t,
                          isGenerating: false,
                          modelResponses: Object.fromEntries(
                              Object.entries(t.modelResponses).map(([k, v]) => [
                                  k,
                                  { ...v, isLoading: false },
                              ])
                          ),
                      }
                    : t
            )
        );
    };

    /**
     * Execute a single LLM model query
     */
    const executeLLMQuery = async (
        model: LLMModel,
        message: string,
        temp: number
    ): Promise<string> => {
        const pixel = `LLM(engine="${model.database_id}" , command=["${message}"], paramValues=[temperature=${temp}])`;

        const llmResponse = await actions.run<[{ response: string }]>(pixel);
        const { output: llmOutput, operationType: llmOperationType } =
            llmResponse.pixelReturn[0];

        if (llmOperationType.indexOf('ERROR') > -1) {
            throw new Error(
                typeof llmOutput === 'string'
                    ? llmOutput
                    : llmOutput?.response || 'Unknown error'
            );
        }

        return llmOutput?.response || '';
    };

    /**
     * Send message to all selected models in parallel
     */
    const sendMessage = handleSubmit(async (data: { MESSAGE: string }) => {
        try {
            setError('');

            if (!data.MESSAGE.trim()) {
                throw new Error('Message is required');
            }

            if (selectedModels.length === 0) {
                throw new Error('Please select at least one model');
            }

            const message = data.MESSAGE.trim();
            const snapshotModels = [...selectedModels];
            const tempSnapshot: Record<string, number> = {};
            snapshotModels.forEach((m) => {
                const modelId = m.database_id || '';
                if (!modelId) return;
                tempSnapshot[modelId] =
                    modelTemperatures[modelId] ?? defaultTemperature;
            });

            const turnId = buildTurnId();
            const myRunId = runIdRef.current;
            const newTurn: ChatTurn = {
                id: turnId,
                message,
                createdAt: Date.now(),
                selectedModels: snapshotModels,
                defaultTemperatureSnapshot: defaultTemperature,
                modelTemperaturesSnapshot: tempSnapshot,
                modelResponses: createInitialResponses(snapshotModels),
                isGenerating: true,
                best: { response: null, isLoading: false, error: null },
            };

            setTurns((prev) => [newTurn, ...prev]);
            setIsLoading(true);

            const promises = snapshotModels.map(async (model) => {
                const modelId = model.database_id || '';
                if (!modelId) return;
                const modelTemp = tempSnapshot[modelId] ?? defaultTemperature;

                try {
                    const response = await executeLLMQuery(
                        model,
                        message,
                        modelTemp
                    );
                    setTurns((prev) =>
                        prev.map((t) => {
                            if (t.id !== turnId) return t;
                            if (runIdRef.current !== myRunId) return t;
                            return {
                                ...t,
                                modelResponses: {
                                    ...t.modelResponses,
                                    [modelId]: {
                                        model,
                                        response,
                                        isLoading: false,
                                        error: null,
                                    },
                                },
                            };
                        })
                    );
                } catch (err) {
                    const errorMessage =
                        err instanceof Error ? err.message : 'Unknown error';
                    setTurns((prev) =>
                        prev.map((t) => {
                            if (t.id !== turnId) return t;
                            if (runIdRef.current !== myRunId) return t;
                            return {
                                ...t,
                                modelResponses: {
                                    ...t.modelResponses,
                                    [modelId]: {
                                        model,
                                        response: null,
                                        isLoading: false,
                                        error: errorMessage,
                                    },
                                },
                            };
                        })
                    );
                }
            });

            await Promise.all(promises);
            setTurns((prev) =>
                prev.map((t) =>
                    t.id === turnId && runIdRef.current === myRunId
                        ? { ...t, isGenerating: false }
                        : t
                )
            );
            reset({ MESSAGE: '' });
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
    const rerunModel = async (turnId: string, model: LLMModel) => {
        const modelId = model.database_id || '';
        if (!modelId) return;
        const turn = turns.find((t) => t.id === turnId);
        if (!turn) return;

        const modelTemp =
            turn.modelTemperaturesSnapshot[modelId] ??
            turn.defaultTemperatureSnapshot;
        const myRunId = runIdRef.current;

        setTurns((prev) =>
            prev.map((t) => {
                if (t.id !== turnId) return t;
                return {
                    ...t,
                    isGenerating: true,
                    modelResponses: {
                        ...t.modelResponses,
                        [modelId]: {
                            ...(t.modelResponses[modelId] || {
                                model,
                                response: null,
                                isLoading: true,
                                error: null,
                            }),
                            isLoading: true,
                            error: null,
                        },
                    },
                };
            })
        );

        try {
            const response = await executeLLMQuery(
                model,
                turn.message,
                modelTemp
            );
            setTurns((prev) =>
                prev.map((t) => {
                    if (t.id !== turnId) return t;
                    if (runIdRef.current !== myRunId) return t;
                    return {
                        ...t,
                        modelResponses: {
                            ...t.modelResponses,
                            [modelId]: {
                                model,
                                response,
                                isLoading: false,
                                error: null,
                            },
                        },
                    };
                })
            );
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Unknown error';
            setTurns((prev) =>
                prev.map((t) => {
                    if (t.id !== turnId) return t;
                    if (runIdRef.current !== myRunId) return t;
                    return {
                        ...t,
                        modelResponses: {
                            ...t.modelResponses,
                            [modelId]: {
                                model,
                                response: null,
                                isLoading: false,
                                error: errorMessage,
                            },
                        },
                    };
                })
            );
        } finally {
            setTurns((prev) =>
                prev.map((t) =>
                    t.id === turnId && runIdRef.current === myRunId
                        ? { ...t, isGenerating: false }
                        : t
                )
            );
        }
    };

    const generateBestResponse = async (turnId: string) => {
        const turn = turns.find((t) => t.id === turnId);
        if (!turn) return;

        const completed = Object.values(turn.modelResponses).filter(
            (r) => !!r.response && !r.isLoading && !r.error
        );

        if (completed.length === 0) {
            setError('No completed model responses available to aggregate yet.');
            return;
        }

        const aggregatorEngine =
            selectedModels[0]?.database_id || turn.selectedModels[0]?.database_id;
        if (!aggregatorEngine) {
            setError('No model available to generate best response.');
            return;
        }

        const myRunId = runIdRef.current;
        setTurns((prev) =>
            prev.map((t) =>
                t.id === turnId
                    ? {
                          ...t,
                          best: { response: null, isLoading: true, error: null },
                      }
                    : t
            )
        );

        const synthesisPrompt = [
            'You are an expert answer synthesizer.',
            'Given multiple model responses to the same user prompt, produce ONE best response:',
            '- accurate, complete, and concise',
            '- resolves contradictions',
            '- structured with headings/bullets when helpful',
            '- do not mention model names',
            '',
            `User prompt:\n${turn.message}`,
            '',
            'Model responses:',
            ...completed.map((c, i) => `\n[Response ${i + 1}]\n${c.response}`),
        ].join('\n');

        try {
            const pixel = `LLM(engine="${aggregatorEngine}" , command=["${synthesisPrompt}"], paramValues=[temperature=0])`;
            const llmResponse = await actions.run<[{ response: string }]>(pixel);
            const { output: llmOutput, operationType: llmOperationType } =
                llmResponse.pixelReturn[0];

            if (llmOperationType.indexOf('ERROR') > -1) {
                throw new Error(
                    typeof llmOutput === 'string'
                        ? llmOutput
                        : llmOutput?.response || 'Unknown error'
                );
            }

            setTurns((prev) =>
                prev.map((t) => {
                    if (t.id !== turnId) return t;
                    if (runIdRef.current !== myRunId) return t;
                    return {
                        ...t,
                        best: {
                            response: llmOutput?.response || '',
                            isLoading: false,
                            error: null,
                        },
                    };
                })
            );
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Unknown error';
            setTurns((prev) =>
                prev.map((t) => {
                    if (t.id !== turnId) return t;
                    if (runIdRef.current !== myRunId) return t;
                    return {
                        ...t,
                        best: { response: null, isLoading: false, error: errorMessage },
                    };
                })
            );
        }
    };

    useEffect(() => {
        setIsLoading(true);
        // Fetch all available LLM models
        const pixel = `MyEngines ( engineTypes=["MODEL"]);`;

        actions
            .run(pixel)
            .then((response) => {
                const { output, operationType } = response.pixelReturn[0];

                if (operationType.indexOf('ERROR') > -1) {
                    throw new Error(output as string);
                }
                if (Array.isArray(output)) {
                    setAvailableModels(output);
                    // Initialize with first model selected
                    if (selectedModels.length === 0 && output.length > 0) {
                        setSelectedModels([output[0]]);
                    }
                }
            })
            .catch((e) => {
                const errorMessage =
                    e instanceof Error ? e.message : 'Failed to load models';
                setError(errorMessage);
            })
            .finally(() => setIsLoading(false));

    }, []);

    return (
        <StyledMainContainer>
            <StyledTopBar position="static">
                <StyledToolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <StyledLogo src={logoIcon} alt="MultiChatBot Logo" />
                    <Typography
                        variant="h6"
                        component="div"
                        sx={{ flexGrow: 0, fontWeight: 600 }}
                    >
                        MultiChatBot
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Powered by SemossSmiths
                        </Typography>
                        <StyledLogo src={ChatbotLogo} alt="MultiChatBot Logo" style={{ height: '20px' }} />
                    </Box>
                </StyledToolbar>
            </StyledTopBar>

            <StyledContentArea>
                {sidebarOpen && (
                    <ModelSelectionSidebar
                        availableModels={availableModels}
                        selectedModels={selectedModels}
                        setSelectedModels={setSelectedModels}
                        defaultTemperature={defaultTemperature}
                        setDefaultTemperature={setDefaultTemperature}
                        modelTemperatures={modelTemperatures}
                        setModelTemperatures={setModelTemperatures}
                        onClose={() => setSidebarOpen(false)}
                    />
                )}

                <StyledComparisonContainer>
                    {turns.length > 0 ? (
                        <Stack spacing={3} sx={{ minWidth: '100%', direction: 'ltr' }}>
                            {turns.map((turn) => (
                                <Box key={turn.id} sx={{ width: '100%' }}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 2,
                                            mb: 1.5,
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar
                                                sx={{
                                                    width: 28,
                                                    height: 28,
                                                    bgcolor: 'primary.main',
                                                    fontSize: '0.75rem',
                                                }}
                                            >
                                                U
                                            </Avatar>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                {turn.message}
                                            </Typography>
                                        </Box>

                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<AutoAwesomeIcon />}
                                            disabled={turn.best.isLoading || turn.isGenerating}
                                            onClick={() => generateBestResponse(turn.id)}
                                        >
                                            Generate Best Response
                                        </Button>
                                    </Box>

                                    {(turn.best.isLoading || turn.best.error || turn.best.response) && (
                                        <Box sx={{ mb: 2 }}>
                                            <ModelComparisonColumn
                                                model={{
                                                    database_name: 'Best Response',
                                                    database_id: 'best',
                                                }}
                                                temperature={0}
                                                question={turn.message}
                                                response={turn.best.response}
                                                isLoading={turn.best.isLoading}
                                                error={turn.best.error}
                                                onCopy={() => setCopySuccess(true)}
                                                onRerun={() => generateBestResponse(turn.id)}
                                            />
                                        </Box>
                                    )}

                                    <StyledPanelsRow>
                                        {turn.selectedModels.map((model) => {
                                            const modelId = model.database_id || '';
                                            const modelResponse = turn.modelResponses[modelId] || {
                                                model,
                                                response: null,
                                                isLoading: false,
                                                error: null,
                                            };
                                            const modelTemp =
                                                turn.modelTemperaturesSnapshot[modelId] ??
                                                turn.defaultTemperatureSnapshot;

                                            return (
                                                <ModelComparisonColumn
                                                    key={`${turn.id}-${modelId}`}
                                                    model={model}
                                                    temperature={modelTemp}
                                                    question={turn.message}
                                                    response={modelResponse.response}
                                                    isLoading={modelResponse.isLoading}
                                                    error={modelResponse.error}
                                                    onCopy={() => setCopySuccess(true)}
                                                    onRerun={() => rerunModel(turn.id, model)}
                                                />
                                            );
                                        })}
                                    </StyledPanelsRow>
                                </Box>
                            ))}
                        </Stack>
                    ) : (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                height: '100%',
                                color: 'text.secondary',
                            }}
                        >
                            <Typography variant="h5" sx={{ mb: 2 }}>
                                MultiChatBot
                            </Typography>
                            <Typography variant="body1" sx={{ textAlign: 'center', maxWidth: '600px' }}>
                                Compare responses from multiple LLM models side by side.
                                Select models from the sidebar and start chatting!
                            </Typography>
                        </Box>
                    )}
                </StyledComparisonContainer>

                <StyledInputContainer>
                    {error && (
                        <Alert
                            severity="error"
                            sx={{ mb: 2, maxWidth: '1200px', margin: '0 auto 16px' }}
                            onClose={() => setError('')}
                        >
                            {error}
                        </Alert>
                    )}
                    {selectedModels.length === 0 && (
                        <Alert
                            severity="info"
                            sx={{ mb: 2, maxWidth: '1200px', margin: '0 auto 16px' }}
                        >
                            Please select at least one model from the sidebar to start chatting.
                        </Alert>
                    )}
                    <form onSubmit={sendMessage} style={{ width: '100%' }}>
                        <StyledInputWrapper>
                            <Controller
                                name={'MESSAGE'}
                                control={control}
                                rules={{ required: true }}
                                render={({ field }) => {
                                    return (
                                        <StyledTextField
                                            {...field}
                                            placeholder="Ask me anything..."
                                            variant="outlined"
                                            fullWidth
                                            multiline
                                            maxRows={4}
                                            // ChatGPT-like: allow typing while models generate.
                                            disabled={selectedModels.length === 0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    if (!isAnyGenerating && selectedModels.length > 0 && field.value.trim()) {
                                                        sendMessage();
                                                    }
                                                }
                                            }}
                                        />
                                    );
                                }}
                            />
                            {isAnyGenerating ? (
                                <StyledSendButton
                                    onClick={stopAllGeneration}
                                    size="large"
                                    title="Stop generating"
                                >
                                    <StopIcon />
                                </StyledSendButton>
                            ) : (
                                <StyledSendButton
                                    type="submit"
                                    disabled={selectedModels.length === 0}
                                    size="large"
                                    title="Send"
                                >
                                    <SendIcon />
                                </StyledSendButton>
                            )}
                        </StyledInputWrapper>
                    </form>
                </StyledInputContainer>
            </StyledContentArea>

            <Snackbar
                open={copySuccess}
                autoHideDuration={2000}
                onClose={() => setCopySuccess(false)}
                message="Response copied to clipboard!"
            />
        </StyledMainContainer>
    );
};
