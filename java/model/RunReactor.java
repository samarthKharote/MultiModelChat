package model;

import prerna.sablecc2.om.PixelDataType;
import prerna.sablecc2.om.nounmeta.NounMetadata;
import prerna.sablecc2.reactor.AbstractReactor;
import prerna.util.Utility;

public class RunReactor extends AbstractReactor {

	public RunReactor() {
		this.keysToGet = new String[] {"question"};
	}
	
	@Override
	public NounMetadata execute() {
		String contextProjectId = this.insight.getContextProjectId();
		if(contextProjectId == null) {
			contextProjectId = this.insight.getProjectId();
		}
		
		if(contextProjectId == null) {
			throw new IllegalArgumentException("Must set the context project to reference the policy bot files");
		}
		
		organizeKeys();
		String question = Utility.decodeURIComponent(this.keyValue.get(this.keysToGet[0])).trim();
//		IProject project = Utility.getProject(contextProjectId);
		Object value = this.insight.getPyTranslator().runScript("my_bot.query(question='"+question+"')");
		return new NounMetadata(value, PixelDataType.CONST_STRING);
	}

}
