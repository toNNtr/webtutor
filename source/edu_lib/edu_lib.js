function isValid(p_aParam) {
    if(p_aParam === "" || p_aParam === undefined || p_aParam === null) {
        return false;
    }

    try {
        if(!isValid(p_aParam.value)) {
            return false;
        }
    } catch (error) {}

    try {
        if(!isValid(p_aParam.Value)) {
            return false;
        }
    } catch (error) {}

    return true;
}
 
function getEduPlanContent(p_iCollaboratorID, p_sCompoundProgramCode) {

    /** Переопределяем входные параметры **/
    if(isValid(p_iCollaboratorID)) {
        iCollaboratorID = p_iCollaboratorID;
    } else {
        iCollaboratorID = undefined;
    }

    if(isValid(p_sCompoundProgramCode)) {
        sCompoundProgramCode = p_sCompoundProgramCode;
    } else {
        sCompoundProgramCode = "";
    }

    arr_oEduPlansContent = Array();
    
    if(isValid(iCollaboratorID)) {
        
        /** Находим все планы обучения на сотрудника */
        query = "for $elem in education_plans where $elem/person_id = " + iCollaboratorID + " return $elem";
        arr_xEduPlans = XQuery(query);
        
        if(ArrayCount(arr_xEduPlans) > 0) {
            
            /** Проходим по каждому плану обучения и формируем объект */
            for(oEduPlan in arr_xEduPlans) {
                
                oEduPlanContent = undefined;
                arr_oPrograms = Array();
                
                oEduPlanDoc = OpenDoc(UrlFromDocID(oEduPlan.id));
                sStatus = (oEduPlanDoc.TopElem.state_id == 1) ? "active" : (oEduPlanDoc.TopElem.state_id == 4) ? "passed" : (oEduPlanDoc.TopElem.state_id == 6) ? "canceled" :"plan";
                
                /** Проходим по каждой активности плана обучения */
                for(oEduPlanProgram in oEduPlanDoc.TopElem.programs) {

                    oProgram = undefined;
                    arr_iRequiredActivitiesID = Array();
                    
                    try {
                        iParentProgramID = oEduPlanProgram.parent_progpam_id.Value;
                    } catch (error) {
                        iParentProgramID = undefined;
                    }
                    try {
                        iResultObjectID = oEduPlanProgram.result_object_id.Value;
                    } catch (error) {
                        iResultObjectID = undefined;
                    }
                    try {
                        dFinishDate = oEduPlanProgram.finish_date.Value;
                    } catch (error) {
                        dFinishDate = undefined;
                    }
                    sStatusActivity = (oEduPlanProgram.state_id == 1) ? "active" : (oEduPlanProgram.state_id == 4) ? "passed" : "plan";

                    /** Устанавливаем плановую дату старта активности */
                    arrFolder = ArraySelect(oEduPlanDoc.TopElem.programs, ("This.id == '" + oEduPlanProgram.parent_progpam_id + "'"));
                    try {
                        dPlanStartDate = tools.AdjustDate(oEduPlanDoc.TopElem.plan_date, oEduPlanProgram.delay_days);
                    } catch (error) {
                        if(ArrayCount(arrFolder) > 0) {
                            dPlanStartDate = tools.AdjustDate(oEduPlanDoc.TopElem.plan_date, arrFolder.delay_days);
                        } else {
                            dPlanStartDate = undefined;
                        }
                    }

                    /** Устанавливаем плановую дату завершения активности */
                    try {
                        if(oEduPlanProgram.days == 0 && isValid(arrFolder)) {
                            dPlanFinishDate = tools.AdjustDate(dPlanStartDate, arrFolder.days);
                        } else {
                            dPlanFinishDate = tools.AdjustDate(dPlanStartDate, oEduPlanProgram.days);
                        }
                    } catch (error) {
                        dPlanFinishDate = undefined;
                    }

                    /** Устанавливаем фактическую дату начала активности */
                    if(oEduPlanProgram.type == "notification_template") {
                        try {
                            dStartDate = dFinishDate;
                        } catch (error) {
                            dStartDate = undefined;
                        }
                    } else {
                        switch(oEduPlanProgram.type) {
                            case "assessment":
                            case "course":

                                try {
                                    query = "for $elem in " + oEduPlanProgram.result_type + "s where $elem/id = " + oEduPlanProgram.result_object_id + " return $elem";
                                    xResultObject = ArrayOptFirstElem(XQuery(query));

                                    if(isValid(xResultObject)) {
                                        dStartDate = xResultObject.start_usage_date.Value;
                                    } else {
                                        dStartDate = undefined;
                                    }
                                } catch (error) {
                                    dStartDate = undefined;
                                }

                                break;

                            case "folder":
                                dStartDate = undefined;
                                break;

                            default:
                                break;
                        }
                    }

                    /** Определяем предыдущие активности, которые требуют прохождения */
                    for(oCompletedParentProgram in oEduPlanProgram.completed_parent_programs) {
                        arr_iRequiredActivitiesID.push(oCompletedParentProgram.program_id.Value);
                    }

                    oProgram = {
                        id: oEduPlanProgram.id.Value,
                        parent_program_id: iParentProgramID,
                        status: sStatusActivity,
                        type: oEduPlanProgram.type.Value,
                        name: oEduPlanProgram.name.Value,
                        plan_start_date: dPlanStartDate,
                        plan_finish_date: dPlanFinishDate,
                        start_date: dStartDate,
                        finish_date: dFinishDate,
                        object_id: oEduPlanProgram.object_id.Value,
                        result_object_id:iResultObjectID,
                        required: oEduPlanProgram.required.Value,
                        required_activities: arr_iRequiredActivitiesID
                    }

                    arr_oPrograms.push(oProgram);
                }

                oEduPlanContent = {
                    id: oEduPlanDoc.TopElem.id.Value,
                    name: oEduPlanDoc.TopElem.name.Value,
                    compound_program_id: oEduPlanDoc.TopElem.compound_program_id.Value,
                    status: sStatus,
                    plan_start_date: oEduPlanDoc.TopElem.plan_date.Value,
                    programs: arr_oPrograms
                }

                arr_oEduPlansContent.push(oEduPlanContent);
            }
        }
    }

    return arr_oEduPlansContent;
}