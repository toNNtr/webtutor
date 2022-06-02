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



function addComment(sComment, sMessage) {
    if(isValid(sMessage)) {
        sComment += Trim(Trim(sComment) + ("\n\n---------- [" + Date() + " ] ----------\n" + sMessage + "\n----------\n"));
    }

    return sComment;
}



function isEmpty(p_Array) {
    return isValid(ArrayOptFirstElem(p_Array));
}


 
function getEduPlanContent(p_iCollaboratorID, p_iEducationPlanID) {

    /** Переопределяем входные параметры **/
    if(isValid(p_iCollaboratorID)) {
        iCollaboratorID = p_iCollaboratorID;
    } else {
        iCollaboratorID = undefined;
    }

    if(isValid(p_iEducationPlanID)) {
        iEducationPlanID = p_iEducationPlanID;
    } else {
        iEducationPlanID = undefined;
    }

    if(!isValid(iCollaboratorID) && !isValid(iEducationPlanID)) {
        throw new Error("Нужен хотябы один параметр.");
    }

    arr_oEduPlansContent = Array();
    arr_sConditions = Array();
    
    if(isValid(iCollaboratorID)) {
        arr_sConditions.push("$elem/person_id = " + iCollaboratorID);
    }

    if(isValid(iEducationPlanID)) {
        arr_sConditions.push("$elem/id = " + iEducationPlanID);
    }
    
    sConditions = arr_sConditions.join(" and ");
    query = "for $elem in education_plans where " + sConditions + " return $elem";
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
                        dFinishDate = DateNewTime(oEduPlanProgram.finish_date.Value, 0, 0, 0);
                    } catch (error) {
                        dFinishDate = undefined;
                    }
                    sStatusActivity = (oEduPlanProgram.state_id == 1) ? "active" : (oEduPlanProgram.state_id == 4) ? "passed" : "plan";

                    /** Устанавливаем плановую дату старта активности */
                    arrFolder = ArraySelect(oEduPlanDoc.TopElem.programs, ("This.id == '" + oEduPlanProgram.parent_progpam_id + "'"));
                    try {
                        dPlanStartDate = DateNewTime(tools.AdjustDate(oEduPlanDoc.TopElem.plan_date, oEduPlanProgram.delay_days), 0, 0, 0);
                    } catch (error) {
                        if(ArrayCount(arrFolder) > 0) {
                            dPlanStartDate = DateNewTime(tools.AdjustDate(oEduPlanDoc.TopElem.plan_date, arrFolder.delay_days), 0, 0, 0);
                        } else {
                            dPlanStartDate = undefined;
                        }
                    }

                    /** Устанавливаем плановую дату завершения активности */
                    try {
                        if(oEduPlanProgram.days == 0 && isValid(arrFolder)) {
                            dPlanFinishDate = DateNewTime(tools.AdjustDate(dPlanStartDate, arrFolder.days), 0, 0, 0);
                        } else {
                            dPlanFinishDate = DateNewTime(tools.AdjustDate(dPlanStartDate, oEduPlanProgram.days), 0, 0, 0);
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
                    education_plan_doc: oEduPlanDoc,
                    status: sStatus,
                    plan_start_date: oEduPlanDoc.TopElem.plan_date.Value,
                    comment: String(oEduPlanDoc.TopElem.comment.Value),
                    programs: arr_oPrograms
                }

                arr_oEduPlansContent.push(oEduPlanContent);
            }
        }

    return arr_oEduPlansContent;
}



function createEduPlan(p_iCollaboratorID, p_iCompoundProgramID) {

    try {
        iCollaboratorID = p_iCollaboratorID;
    } catch (error) {
        iCollaboratorID = undefined;
    }

    try {
        iCompoundProgramID = p_iCompoundProgramID;
    } catch (error) {
        iCompoundProgramID = undefined;
    }

    if(!isValid(iCollaboratorID) && !isValid(iCompoundProgramID)) {
        return;
    } else {

        /** Находим существующие планы */
        query = "for $elem in education_plans where $elem/person_id = " + iCollaboratorID + " and $elem/compound_program_id = " + iCompoundProgramID + " and ($elem/state_id = 0 or $elem/state_id = 1) return $elem";
        arr_xEduPlans = XQuery(query);

        /** Если планы найдены, тогда ничего не делаем */
        if(ArrayCount(arr_xEduPlans) > 0) {
            return;
        }

        /** Открываем карточку модульной программы */
        oCompoundProgramDoc = OpenDoc(UrlFromDocID(iCompoundProgramID));

        /** Создаем план обучения */
        oEduPlanDoc = OpenNewDoc("x-local://wtv/wtv_education_plan.xmd");
        oEduPlanDoc.BindToDb();

        oEduPlanDoc.TopElem.code = oCompoundProgramDoc.TopElem.code;
        oEduPlanDoc.TopElem.name = oCompoundProgramDoc.TopElem.name;
        oEduPlanDoc.TopElem.compound_program_id = oCompoundProgramDoc.TopElem.id;
        oEduPlanDoc.TopElem.type = "collaborator";
        oEduPlanDoc.TopElem.create_date = Date();
        oEduPlanDoc.TopElem.plan_date = DateNewTime(Date(), 0, 0, 0);

        /** Данные о сотруднике для плана обучения */
        query = "for $elem in collaborators where $elem/id = " + iCollaboratorID + " return $elem";
        xCollaborator = ArrayOptFirstElem(XQuery(query));

        oEduPlanDoc.TopElem.person_id = xCollaborator.id;
        oEduPlanDoc.TopElem.person_fullname = xCollaborator.fullname;
        oEduPlanDoc.TopElem.person_position_id = xCollaborator.position_id;
        oEduPlanDoc.TopElem.person_position_name = xCollaborator.position_name;
        try {
            oEduPlanDoc.TopElem.person_position_code = xCollaborator.position_id.ForeignElem.code;
        } catch (error) {}
        oEduPlanDoc.TopElem.person_org_id = xCollaborator.org_id;
        oEduPlanDoc.TopElem.person_org_name = xCollaborator.org_name;
        try {
            oEduPlanDoc.TopElem.person_org_code = xCollaborator.org_id.ForeignElem.code;
        } catch (error) {}
        oEduPlanDoc.TopElem.person_subdivision_id = xCollaborator.position_parent_id;
        oEduPlanDoc.TopElem.person_subdivision_name = xCollaborator.position_parent_name;
        try {
            oEduPlanDoc.TopElem.person_subdivision_code = xCollaborator.position_parent_id.ForeignElem.code;
        } catch (error) {}

        oEduPlanDoc.TopElem.programs.AssignElem(oCompoundProgramDoc.TopElem.programs);

        for(oProgram in oEduPlanDoc.TopElem.programs) {
            oProgram.finish_date.Clear();
            oProgram.plan_date.Clear();
        }

        oEduPlanDoc.TopElem.update_status_and_activity = false;

        oEduPlanDoc.Save();

        return oEduPlanDoc; 
    }
}



function saveEduPlan(p_oEduPlanContent) {
    oEduPlanDoc = p_oEduPlanContent.education_plan_doc;
    bChanged = false;

    /** Сохранение активностей */
    for(oProgramContent in p_oEduPlanContent.programs) {
        oProgram = ArrayFind(oEduPlanDoc.TopElem.programs, "id == " + oProgramContent.id);
        oProgram.result_object_id = oProgramContent.result_object_id;

        switch(oProgramContent.status) {
            case "plan":
                if(oProgram.state_id != 0) {
                    oProgram.state_id = 0;
                    oProgram.finish_date.Clear();
                    oProgramContent.finish_date = null;
                    oProgram.result_type.Clear();
                    oProgram.result_object_id.Clear();
                    oProgramContent.result_object_id = null;
                    bChanged = true;
                }
                break;

            case "active":
                if(oProgram.state_id != 1) {
                    oProgram.state_id = 1;
                    oProgram.finish_date.Clear();
                    oProgramContent.finish_date = null;

                    switch(oProgramContent.type) {
                        case "assessment":
                            sCatalogType = "test_learning";
                        case "course":
                            try {
                                sCatalogType;
                            } catch (error) {
                                sCatalogType = "learning";
                            }

                            oProgram.result_type = "active_" + sCatalogType;
                            break;
                        default:
                            break;
                    }

                    bChanged = true;
                }
                break;

            case "passed":
                if(oProgram.state_id != 4) {
                    oProgram.state_id = 4;

                    switch(oProgramContent.type) {
                        case "assessment":
                            sCatalogType = "test_learning";
                        case "course":
                            try {
                                sCatalogType;
                            } catch (error) {
                                sCatalogType = "learning";
                            }

                            oProgram.result_type = sCatalogType;
                            oProgram.finish_date = oProgram.result_object_id.ForeignElem.last_usage_date;
                            break;

                        case "notification_template":
                            oProgram.finish_date = Date();
                            break;

                        default:
                            oProgram.finish_date = Date();
                            break;
                    }
                    bChanged = true;
                }
                break;
        }
    }

    /** Сохранение параметров плана обучения */
    oEduPlanDoc.TopElem.comment = p_oEduPlanContent.comment;

    switch(p_oEduPlanContent.status) {
        case "plan":
            if(oEduPlanDoc.TopElem.state_id != 0) {
                oEduPlanDoc.TopElem.state_id = 0;
                oEduPlanDoc.TopElem.finish_date.Clear();
                bChanged = true;
            }
            break;

        case "active":
            if(oEduPlanDoc.TopElem.state_id != 1) {
                oEduPlanDoc.TopElem.state_id = 1;
                oEduPlanDoc.TopElem.finish_date.Clear();
                bChanged = true;
            }
            break;

        case "passed":
            if(oEduPlanDoc.TopElem.state_id != 4) {
                oEduPlanDoc.TopElem.state_id = 4;
                oLastFinishedActivity = ArrayOptFirstElem(ArraySort(ArraySelect(oEduPlanDoc.TopElem.programs, "type != 'folder' && required"), "finish_date", "-"));
                if(isValid(oLastFinishedActivity)) {
                    oEduPlanDoc.TopElem.finish_date = oLastFinishedActivity.finish_date;
                }

                bChanged = true;
            }
            break;
        case "cancelled":
            if(oEduPlanDoc.TopElem.state_id != 6) {
                oEduPlanDoc.TopElem.state_id = 6;
                oEduPlanDoc.TopElem.finish_date = Date();
                bChanged = true;
            }
    }

    if(bChanged) {
        oEduPlanDoc.TopElem.last_activity_date = Date();
        oEduPlanDoc.Save();
    }
}



function updateEduPlan(p_aEduPlan) {
    try {
        Int(p_aEduPlan);
        oEduPlan = ArrayOptFirstElem(getEduPlanContent(undefined, p_aEduPlan));
    } catch (error) {
        oEduPlan = p_aEduPlan;
    }
    
    if(!isValid(oEduPlan)) {
        return;
    }

    /** Обновление статусов активностей */
    updateEduPlanPrograms(null, oEduPlan);

    /** Обновление статуса плана обучения */

    if(oEduPlan.status != "cancelled") {

        /** Статус passed если все обязательные активности пройдены */
        oNotPassedProgram = ArrayOptFind(oEduPlan.programs, "status != 'passed' && type != 'folder' && required");

        if(!isValid(oNotPassedProgram)) {
            oEduPlan.status = "passed";
        } else {
            oActiveProgram = ArrayOptFind(oEduPlan.programs, "(status == 'active' || status == 'passed') && type != 'folder'");
            if(isValid(oActiveProgram)) {
                oEduPlan.status = "active";
            } else {
                oEduPlan.status = "plan";
            }
        }
    }

    saveEduPlan(oEduPlan);
}



function updateEduPlanPrograms(p_iCurrentProgramID, p_oEduPlan) {
    arr_oPrograms = ArraySelect(p_oEduPlan.programs, "parent_program_id == p_iCurrentProgramID");
    for(oProgram in arr_oPrograms) {
        updateEduPlanPrograms(oProgram.id, p_oEduPlan);

        switch(oProgram.type) {
            case "folder":
                arr_oChildPrograms = ArraySelect(p_oEduPlan.programs, "parent_program_id == oProgram.id");
                
                // Статус passed если все активности завершены
                oNotFinishedProgram = ArrayOptFind(arr_oChildPrograms, "status != 'passed' && required");

                if(!isValid(oNotFinishedProgram)) {
                    oProgram.status = "passed";
                    break;
                }

                // Статус active если есть хотя бы одна активность в процессе или есть хотя бы одна завершенная активность
                oActiveProgram = ArrayOptFind(arr_oChildPrograms, "status == 'active' || status == 'passed'");
                if(isValid(oActiveProgram)) {
                    oProgram.status = "active";
                    break;
                }

                // Статус plan во всех остальных случаях
                oProgram.status = "plan";
                break;


            case "assessment":
                sCatalogType = "test_learning";
                sObjectType = "assessment";
            case "course":
                try {
                    sCatalogType;
                } catch (error) {
                    sCatalogType = "learning";
                    sObjectType = "course";
                }
       
                // Статус passed если есть завершенные учебные активности
                queryFinished = "for $elem in " + sCatalogType + "s where $elem/" + sObjectType + "_id = " + oProgram.object_id + " and $elem/education_plan_id = " + p_oEduPlan.id + " order by $elem/last_usage_date ascending return $elem";
                queryActive = "for $elem in active_" + sCatalogType + "s where $elem/" + sObjectType + "_id = " + oProgram.object_id + " and $elem/education_plan_id = " + p_oEduPlan.id + " and MatchSome($elem/state_id, (2,3,4)) order by $elem/last_usage_date ascending return $elem";
                xFinishedLearning = ArrayOptFirstElem(ArrayUnion(XQuery(queryFinished), XQuery(queryActive)));
                
                if(isValid(xFinishedLearning)) {
                    oProgram.status = "passed";
                    oProgram.result_object_id = xFinishedLearning.id;
                    break;
                }
                
                // Статус active если есть активные учебные активности
                query = "for $elem in active_" + sCatalogType + "s where $elem/" + sObjectType + "_id = " + oProgram.object_id + " and $elem/education_plan_id = " + p_oEduPlan.id + " order by $elem/last_usage_date ascending return $elem";
                xActiveLearning = ArrayOptFirstElem(XQuery(query));
                if(isValid(xActiveLearning)) {
                    oProgram.status = "active";
                    oProgram.result_object_id = xActiveLearning.id;
                    break;
                }

                // Статус plan если назначенного теста нет
                oProgram.status = "plan";
                break;


            case "notification_template":
                break;
            default:
                break;
        }
    }
}



function assignEduPlanActivities(p_iEducationPlanID) {

    oEduPlanContent = ArrayOptFirstElem(getEduPlanContent(undefined, p_iEducationPlanID));

    /** Находим все родительские активности */
    arr_oParentActivities = ArraySelect(oEduPlanContent.programs, "This.parent_program_id == null && This.status != 'passed'");

    for(oParentActivity in arr_oParentActivities) {

        /** Если текущая дата меньше либо равна планируемой дате, тогда проверяем, пройдены ли обязательные активности */
        if(oParentActivity.plan_start_date <= Date()) {
            try {

                /** Если активность назначена, тогда завершается выполнение функции */ 
                if(assignActivity(oParentActivity, oEduPlanContent)) {
                    return updateEduPlan(oEduPlanContent);
                }      

            } catch (error) {
                if(error.message == "Required activity not passed!") {
                    oEduPlanContent.status = "cancelled";
                    oEduPlanContent.comment = addComment(oEduPlanContent.comment, "План обучения был автоматически переведен в статус \"Отменен\" в связи с непрохождением обязательных активностей.");
                    return updateEduPlan(oEduPlanContent);
                }
                throw error;
            }
        }
        
        /** Находим дочерние активности */
        arr_oChildActivities = ArraySelect(oEduPlanContent.programs, ("This.parent_program_id == " + oParentActivity.id) + " && This.status == 'plan'");
        
        for(oChildActivity in arr_oChildActivities) {
            try {

                /** Если активность назначена, тогда завершается выполнение функции */ 
                if(assignActivity(oChildActivity, oEduPlanContent)) {
                    return updateEduPlan(oEduPlanContent);
                }          
                
            } catch (error) {
                if(error.message == "Required activity not passed!") {
                    oEduPlanContent.status = "cancelled";
                    oEduPlanContent.comment = addComment(oEduPlanContent.comment, "План обучения был автоматически переведен в статус \"Отменен\" в связи с непрохождением обязательных активностей.");
                    return updateEduPlan(oEduPlanContent);
                }
                throw error;
            }
        }
    }

    /** Обновляем статусы плана обучения */
    updateEduPlan(oEduPlanContent);
    
}



function assignActivity(p_oProgram, p_oEduPlanContent) {

    if(p_oProgram.plan_start_date <= Date()) {

        /** Проходим по активностям, которые должны быть к моменту назначения пройдена */
        for(iRequiredActivities in p_oProgram.required_activities) {

            oRequiredActivity = ArrayOptFind(p_oEduPlanContent.programs, ("This.id == " + iRequiredActivities));

            /** Если найдена незавершенная обязательная активность к дате назначения, план отменяется */
            if(isValid(oRequiredActivity)) {
                if(oRequiredActivity.status != "passed") {
    
                    /** Отменяем план обучения */
                    p_oEduPlanContent.status = "canceled";
                    saveEduPlan(p_oEduPlanContent);
    
                    throw new Error("Required activity not passed!");
    
                }
            }

        }

        try {
            
            iCollaboratorID = p_oEduPlanContent.education_plan_doc.TopElem.person_id;
            
            switch(p_oProgram.type) {
        
                case "folder":
                    break;
        
                case "assessment":
                    tools.activate_test_to_person({
                        iPersonID: iCollaboratorID,
                        iAssessmentID: p_oProgram.object_id,
                        iEducationPlanID: p_oEduPlanContent.id
                    });
                    return true;
                    
                case "course":
                    tools.activate_course_to_person({
                        iPersonID: iCollaboratorID,
                        iCourseID: p_oProgram.object_id,
                        iEducationPlanID: p_oEduPlanContent.id
                    });
                    return true;
        
                case "notification_template":
                    try {
                        query = "for $elem in notification_templates where $elem/id = " + p_oProgram.object_id + " return $elem";
                        xNotification = ArrayOptFirstElem(XQuery(query));
                        tools.create_notification(xNotification.code, iCollaboratorID);
                        p_oProgram.status = "passed";

                        return true;
                    } catch (error) {
                        alert("[edu_lib | assignActivity] Notification template not found! ERROR = " + error); 
                    }
                    break;
        
                default:
                    break;
    
            }
    
        } catch (error) {
            alert("[edu_lib | assignActivity] ERROR = " + error); 
        }

    }

    return false;

}