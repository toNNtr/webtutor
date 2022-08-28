function getEvents(p_sEventID, p_sEventType, p_sDateFrom, p_sDateTo, p_sStatus, p_sOrgForm, p_sEducationOrg) {

    /** Декодируем данные */
    arr_sEventIDs = UrlDecode(p_sEventID).split(",");
    arr_sEventTypes = UrlDecode(p_sEventType).split(",");
    p_sDateFrom = UrlDecode(p_sDateFrom);
    p_sDateTo = UrlDecode(p_sDateTo);
    arr_sStatuses = UrlDecode(p_sStatus).split(",");
    arr_sOrgForms = UrlDecode(p_sOrgForm).split(",");
    arr_sEducationOrgs = UrlDecode(p_sEducationOrg).split(",");


    /** Значения по умолчанию и допустимые значения для поля "Тип мероприятия" */
    arr_sAllowedEventTypes = [
        "one_time",
        "dist_test",
        "compound_program",
        "webinar"
    ];

    /** Значения по умолчанию и допустимые значения для поля "Статус проведения мероприятия" */
    arr_sAllowedStatuses = [
        "plan",
        "active",
        "close",
        "cancel"
    ];
    
    /** Значения по умолчанию и допустимые значения для поля "Организационная форма" */
    arr_sAllowedOrgForms = [
        "praksem",
        "vebinar"
    ];
    
    /** Значения по умолчанию и допустимые значения для поля "Обучающая организация" */
    arr_sAllowedEducationOrgs = [
        "org_rubezh",
        "org_rubezh_r3",
        "org_design_rubezh",
        "org_global",
        "org_sonar",
        "org_rvi",
        "org_soft_rvi",
        "org_strazh",
        "org_r-platform",
        "org_layta",
        "org_ptk",
        "org_yc_rubezh"
    ];


    /** Фильтрация входных данных по допустимым значениям для поля "Тип мероприятия" */
    arr_sEventTypes = ArrayIntersect(arr_sEventTypes, arr_sAllowedEventTypes);
    if(eduLib.isEmpty(arr_sEventTypes)) {
        arr_sEventTypes = arr_sAllowedEventTypes;
    }

    /** Фильтрация входных данных по допустимым значениям для поля "Статус проведения мероприятия" */
    arr_sStatuses = ArrayIntersect(arr_sStatuses, arr_sAllowedStatuses);
    if(eduLib.isEmpty(arr_sStatuses)) {
        arr_sStatuses = arr_sAllowedStatuses;
    }

    /** Фильтрация входных данных по допустимым значениям для поля "Организационная форма" */
    arr_sOrgForms = ArrayIntersect(arr_sOrgForms, arr_sAllowedOrgForms);
    if(eduLib.isEmpty(arr_sOrgForms)) {
        arr_sOrgForms = arr_sAllowedOrgForms;
    }

    /** Фильтрация входных данных по допустимым значениям для поля "Обучающая организация" */
    arr_sEducationOrgs = ArrayIntersect(arr_sEducationOrgs, arr_sAllowedEducationOrgs);
    if(eduLib.isEmpty(arr_sEducationOrgs)) {
        arr_sEducationOrgs = arr_sAllowedEducationOrgs;
    }


    /** Устанавливаем значение по умолчанию у поля "Дата начала периода выборки" */
    if(!eduLib.isValid(p_sDateFrom)) {
        p_sDateFrom = StrDate(DateNewTime(tools.AdjustDate(Date(), -10), 0, 0, 0));
    } else if(DateNewTime(Date(p_sDateFrom), 0, 0, 0) < DateNewTime(tools.AdjustDate(Date(), -30), 0, 0, 0)) {
        p_sDateFrom = StrDate(DateNewTime(tools.AdjustDate(Date(), -30), 0, 0, 0));
    }

    /** Устанавливаем значение по умолчанию у поля "Дата окончания периода выборки" */
    if(!eduLib.isValid(p_sDateTo) || (DateNewTime(Date(p_sDateTo), 0, 0, 0) > DateNewTime(tools.AdjustDate(Date(), 31), 0, 0, 0))) {
        p_sDateTo = StrDate(DateNewTime(tools.AdjustDate(Date(), 31), 0, 0, 0));
    }

    if(Date(p_sDateFrom) > Date(p_sDateTo)) {
        p_sDateFrom = StrDate(DateNewTime(tools.AdjustDate(p_sDateTo, -1), 0, 0, 0));
    }


    arr_sConditions = Array();
    arr_sSubConditions = Array();

    /** Формируется условие на поиск конкретных мероприятий */
    if(!eduLib.isEmpty(arr_sEventIDs)) {
        for(sEventID in arr_sEventIDs) {
            arr_sSubConditions.push("$elem/id = " + sEventID);
        }
        arr_sConditions.push("(" + arr_sSubConditions.join(" or ") + ")");
    } else {

        /** Формируем условие на поиск мероприятий заданного типа  */
        if(!eduLib.isEmpty(arr_sEventTypes)) {
            arr_sSubConditions = Array();

            for(sEventType in arr_sEventTypes) {
                arr_sSubConditions.push("$elem/type_id = '" + sEventType + "'");
            }
            arr_sConditions.push("(" + arr_sSubConditions.join(" or ") + ")");
        }

        /** Формируем условие для начала периода выгрузки мероприятий  */
        if(eduLib.isValid(p_sDateFrom)) {
            arr_sConditions.push("$elem/start_date >= date('" + p_sDateFrom + "')");
        }

        /** Формируем условие для окончания периода выгрузки мероприятий  */
        if(eduLib.isValid(p_sDateTo)) {
            arr_sConditions.push("$elem/start_date < date('" + p_sDateTo + "')");
        }

        /** Формируем условие статуса мероприятия  */
        if(!eduLib.isEmpty(arr_sStatuses)) {
            arr_sSubConditions = Array();

            for(sStatus in arr_sStatuses) {
                arr_sSubConditions.push("$elem/status_id = '" + sStatus + "'");
            }
            arr_sConditions.push("(" + arr_sSubConditions.join(" or ") + ")");
        }

        /** Формируем условие для организационной формы  */
        if(!eduLib.isEmpty(arr_sOrgForms)) {
            arr_sSubConditions = Array();

            for(sOrgForm in arr_sOrgForms) {
                arr_sSubConditions.push("$elem/organizational_form = '" + sOrgForm + "'");
            }
            arr_sConditions.push("(" + arr_sSubConditions.join(" or ") + ")");
        }

        /** Формируем условие для обучающей организации  */
        if(!eduLib.isEmpty(arr_sEducationOrgs)) {
            arr_sSubConditions = Array();

            for(sEducationOrg in arr_sEducationOrgs) {
                arr_sSubConditions.push("ForeignElem($elem/education_org_id)/code = '" + sEducationOrg + "'");
            }
            arr_sConditions.push("(" + arr_sSubConditions.join(" or ") + ")");
        }
    }

    query = "for $elem in events where " + arr_sConditions.join(" and ") + " return $elem";
    alert(query);
    arr_xEvents = XQuery(query);

    arr_oEvents = new Array();

    for(xEvent in arr_xEvents) {
        try {

            oEventDoc = OpenDoc(UrlFromDocID(xEvent.id));

            /** Место проведения мероприятия */
            try {
                sPlace = xEvent.place_id.ForeignElem.name;
            } catch (error) {
                sPlace = "";
            }

            /** Ссылка на мероприятие */
            try {
                sUrl = UrlAppendPath(global_settings.settings.portal_base_url, ("view_doc.html?mode=event&object_id=" + xEvent.id));
            } catch (error) {
                sUrl = "";
            }

            /** Максимальное количество участников мероприятия */
            if(eduLib.isValid(oEventDoc.TopElem.max_person_num)) {
                sMaxCollaborators = Int(oEventDoc.TopElem.max_person_num);
            } else {
                sMaxCollaborators = null;
            }

            /** Преподаватели (ведущие) мероприятия */
            arr_oLectors = new Array();
            query = "for $lec in lectors, $elem in event_lectors where $lec/id = $elem/lector_id and $elem/event_id = " + xEvent.id + " return $lec";
            arr_xLectors = XQuery(query);

            for(xLector in arr_xLectors) {

                /** ФИО преподавателя (ведущего) */
                try {
                    if(!eduLib.isValid(xLector.person_id.ForeignElem.fullname)) {
                        throw "EmptyLectorFullname";
                    }
                    
                    sLectorFullname = String(xLector.person_id.ForeignElem.fullname);
                } catch (error) {
                    if(eduLib.isValid(xLector.lector_fullname)) {
                        sLectorFullname = String(xLector.lector_fullname);
                    } else {
                        sLectorFullname = null;
                    }
                }

                /** Должность преподавателя (ведущего) */
                try {
                    if(!eduLib.isValid(xLector.person_id.ForeignElem.position_name)) {
                        throw "EmptyLectorPosition";
                    }

                    sLectorPosition = String(xLector.person_id.ForeignElem.position_name);
                } catch (error) {
                    if(eduLib.isValid(xLector.person_position_name)) {
                        sLectorPosition = String(xLector.person_position_name);
                    } else {
                        sLectorPosition = null;
                    }
                }

                oLector = {
                    lector_fullname: sLectorFullname,
                    lector_position: sLectorPosition
                }

                arr_oLectors.push(oLector);
            }

            /** Обучающая организация */
            try {
                sEducationOrgCode = xEvent.education_org_id.ForeignElem.code;
            } catch (error) {
                sEducationOrgCode = null;
            }

            /** Формируем объект с данными о мероприятии */
            oEvent = {
                id: String(xEvent.id),
                name: String(xEvent.name),
                type: String(xEvent.type_id),
                start_date: StrDate(xEvent.start_date),
                finish_date: StrDate(xEvent.finish_date),
                status: String(xEvent.status_id),
                org_form: String(xEvent.organizational_form),
                place: String(sPlace),
                url: String(sUrl),
                count_collaborators: Int(xEvent.person_num),
                max_collaborators: sMaxCollaborators,
                lectors: arr_oLectors,
                education_org: String(sEducationOrgCode)
            };

            
            arr_oEvents.push(oEvent);

        } catch (error) {
            alert("[api | events.js] xEvent.id = " + xEvent.id + "\nERROR: " + error);
        }
    }

    return EncodeJson(arr_oEvents);

}