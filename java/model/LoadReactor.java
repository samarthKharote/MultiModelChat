package model;

import prerna.project.api.IProject;
import prerna.sablecc2.om.PixelDataType;
import prerna.sablecc2.om.nounmeta.NounMetadata;
import prerna.sablecc2.reactor.AbstractReactor;
import prerna.util.AssetUtility;
import prerna.util.Utility;
import java.util.Properties;

public class LoadReactor extends AbstractReactor {

	@Override
	public NounMetadata execute() {
		String contextProjectId = this.insight.getContextProjectId();
		if(contextProjectId == null) {
			contextProjectId = this.insight.getProjectId();
		}

		if(contextProjectId == null) {
			throw new IllegalArgumentException("Must set the context project to reference the policy bot files");
		}

		IProject project = Utility.getProject(contextProjectId);
		Properties projectProperties = project.getSmssProp();

		String modelEngineID = projectProperties.getProperty("MODEL_ENGINE_ID");
        if(modelEngineID == null)
            modelEngineID = "f5f7fd76-a3e5-4dba-8cbb-ededf0f612b4";
		String embeddingEngineID = projectProperties.getProperty("EMBEDDING_MODEL_ID");
        if(embeddingEngineID == null)
        	embeddingEngineID = "1c9320a1-52a7-4f6d-9599-fb7c33a0572e";
		String translateEngineID = projectProperties.getProperty("TRANSLATE_MODEL_ID");
        if(translateEngineID == null)
            translateEngineID = "5b0c6586-4ab8-4905-83e4-1bab3b6a1966";


		String modelEngineDeclaration = fillVars("modelEngine = ModelEngine(engine_id='"+modelEngineID+"', insight_id='${i}')\n");
		String embeddingModelDeclaration = fillVars("embeddingModelEngine = ModelEngine(engine_id='"+embeddingEngineID+"', insight_id='${i}')\n");
		String translateModelDeclaration = fillVars("translateModelEngine = ModelEngine(engine_id='"+translateEngineID+"', insight_id='${i}')\n");

		String assetsDir = AssetUtility.getProjectAssetFolder(contextProjectId).replace("\\", "/");

		String init_script = "'my_bot' in globals().keys()";
		String exists = this.insight.getPyTranslator().runScript(init_script) + "abc";
		if(exists.contains("false")){
			String script = "import sys\n"+
					"import os\n"+
					"sys.path.append('"+assetsDir+"/py')\n"+
					"os.chdir('"+assetsDir+"/py')\n"+
					"import model_bot as pb2\n"+
					"from gaas_gpt_model import ModelEngine\n"+
					modelEngineDeclaration+
					embeddingModelDeclaration+
					translateModelDeclaration+
					"my_bot=pb2.ModelBot(modelEngine = modelEngine, embeddingModelEngine = embeddingModelEngine, translateModelEngine = translateModelEngine)"
					;

			this.insight.getPyTranslator().runEmptyPy(script);
		}
		
		return new NounMetadata(exists, PixelDataType.CONST_STRING);
	}

}
