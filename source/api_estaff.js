function CreateSOAPRequest(name)
{
	this.name = name;
	if (global_settings.settings.recruitment.estaff_server_url.HasValue)
		this.server_url = global_settings.settings.recruitment.estaff_server_url;
	if (global_settings.settings.recruitment.estaff_login.HasValue)
		this.login = global_settings.settings.recruitment.estaff_login;
	if (global_settings.settings.recruitment.estaff_password.HasValue)
		this.password = global_settings.settings.recruitment.estaff_password;


	requestStr = "<?xml version=\"1.0\" encoding=\"utf-8\"?><soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.division/soap/envelope/\"><soap:Body></soap:Body></soap:Envelope>";
	var request = OpenDocFromStr(requestStr).TopElem;
	this.request = request;
	var body = request.Child("soap:Body").AddChild(name);
	//подготовка контейнеров параметров
	switch(name)
	{
		case "AddVacancy":
			body.AddChild("vacancy");
			break;
		case "GetDocFields":
			body.AddChild("request").AddChild("fields");
			body.request.AddChild("object_type", "string");
			break;
		case "GetXQuery":
			body.AddChild("request").AddChild("fields");
			body.request.AddChild("xquery", "string");
			break;
		case "AddAttachment":
			body.AddChild("attachment").AddChild("file");
			body.attachment.AddChild("object_type", "string");
			body.attachment.file.AddChild("file_name", "string");
			body.attachment.file.AddChild("type_id", "string");
			body.attachment.file.AddChild("data", "string");
			break;
		case "GetAttachments":
			body.AddChild("request");
			body.request.AddChild("object_id", "string");
			body.request.AddChild("object_type", "string");
			break;
		case "AddDivision":
			body.AddChild("division");
			body.AddChild("options");
			body.AddChild("embedded");
			break;
		case "AddPerson":
			body.AddChild("person");
			break;
		case "AddCandidate":
			body.AddChild("candidate");
			break;
		case "AddEvent":
			body.AddChild("event");
			break;
	}
}

function GetRequestParam(name)
{
	var result;
	try
	{
		result = this.GetRequest().Child("soap:Body").Child(this.name).Child(name);
	}
	catch(e) {alert(e);}
	return result;
}

function SetRequestParam(value)
{
	var method = this.GetRequest().Child("soap:Body").Child(this.name);
	var xValue = OpenDocFromStr(tools.object_to_text(value, 'xml')).TopElem;
	
	method.Child(xValue.Name).Delete();
	method.AddChildElem(xValue);	
	result = method.Child(xValue.Name);	
	return result;
}

function SendRequest()
{
	var result = true;
	
	if (!this.server_url.HasValue)
	{
		throw("Не задан адрес сервера E-Staff.");
	}
	
	var serviceUrl = UrlAppendPath(this.server_url, "/services/WebTutorAPIService");
	serviceUrl = StrReplace(serviceUrl, '\\', '/');

	try
	{
		DebugLog("Call API method " + this.name + " from " + serviceUrl + ". E-Staff login: " + this.login + ((this.password=="")?", password is empty.":""));
		
		var arrHeader = [];
		arrHeader.push("Content-type: text/xml; charset=utf-8");
		arrHeader.push("SOAPAction: http://www.e-staff.ru/soap/" + this.name );
		arrHeader.push("Authorization: Basic " + Base64Encode(this.login + ":" + this.password));
		arrHeader.push("Ignore-Errors:0");

		resp = HttpRequest( serviceUrl, "post", this.GetRequest().Xml, ArrayMerge(arrHeader, "This", "\n"));
		DebugLog("Request:\n" + this.GetRequest().Xml +
			"\nResponse:\n" + resp.Body);
		this.response = OpenDocFromStr(resp.Body).TopElem.Child("soap:Body").Child(this.name+"Response");
		
		
		// estaff_api log
		var logMsg = "";
		if(StrBegins(this.name,"Add"))
		{
			try
			{
				logMsg = " ID: " + this.response.Child(StrLowerCase(StrCharRangePos(this.name, 3, StrCharCount(this.name))) + "_id").Value;
			} catch(e) {DebugLog(e);}
		}
		else if(this.name=="GetDocFields")
			logMsg = " ID: " + this.response.object_id;
		else if(this.name=="GetXQuery")
			logMsg = " XQuery: " + this.request.Child("soap:Body").Child(name).request.xquery;
		else if(this.name=="GetAttachments")
		{
			for(fldAttachment in this.response.attachments)
			{
				if(fldAttachment.ChildExists("text"))
					fldAttachment.text = Base64Decode(fldAttachment.text);
			}
			logMsg = " ID: " + this.request.Child("soap:Body").Child(name).request.object_id;
		}

		Log("API method " + this.name +" completed." + logMsg);
	}
	catch ( e )
	{
		result = false;
		var response = {error:true, error_message:e};
		this.response = response;
		DebugLog("API method " + this.name + " by user " + this.login + " error: " + e);
		alert(e);
	}
	return result;
}

function GetRequest()
{
	return this.request;
	//return this.request.Object; // Для xhttp, где параметр STRICT еще не введен.
}
function GetResponse()
{
	return this.response;
	//return this.response.Object; // Для xhttp, где параметр STRICT еще не введен.
}

function Log(text)
{
	EnableLogExt('estaff_api','life-time=month');
	LogEvent('estaff_api', text);
}
function DebugLog(text)
{
	if(global_settings.debug)
		Log(text);
}