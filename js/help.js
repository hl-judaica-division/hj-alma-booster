$(function() {
    update_help_page();
    add_ids();
    build_table_of_contents();
    $("body").scrollspy({
        target: "#table_of_contents",
    });

    // Add smooth scrolling on all links inside the navbar
    $("#table_of_contents a").on("click", function(event) {
        if (this.hash !== "") {
            event.preventDefault();
            const hash = this.hash;
            $("html, body").animate({
                scrollTop: $(hash).offset().top,
            }, 1000, function() {
                window.location.hash = hash;
            });
        }
    });
});

/**
 * Build help page from templates
 */
function update_help_page() {
    const popup_holder = document.getElementById("popup_booster_holder");
    new_booster_card({
        "title": "Statistics",
        "details": `NOTE: This Booster will only work in the Harvard Library Alma environment, although the technique may be useful to other installations as a model for a booster to construct and add field data.
        The Statistics booster allows you to quickly build a 920 field; the local holdings field used at Harvard to store cataloguing statistics data. The 920 field is generated dynamically\
        as you add input. It can then either be copied manually from the box or applied directly to records with Macro Express.\
        In order to use Macro Express you must create a new script make the trigger a clipboard event that looks for "ALMA_STATISTICS|".\
        Then you can start it by pressing the Macro Copy button. The macro assumes that the bibliographic and holdings records are already\
        open and on screen in the Metadata Editor. The Harvard Library Judaica Division Macro Express script used in conjunction with this\
        Booster is available via GitHub <a target="_blank" class="text-danger" href="https://github.com/hl-judaica-division/hj-alma-booster-macro-express-helper">here</a>.`,
        "fields": [{
            "field": "Unit",
            "type": "Dropdown",
            "required": "Yes",
            "pers": "Yes",
            "details": "Select your unit from the dropdown. The list can be changed in the settings menu.",
        }, {
            "field": "Cataloguer",
            "type": "Text",
            "required": "Yes",
            "pers": "Yes",
            "details": "The individual logging statistics. This can be auto-filled from Alma if enabled in the settings. Otherwise it can be manually entered.",
        }, {
            "field": "Note",
            "type": "Text",
            "required": "No",
            "pers": "No",
            "details": "Note for subfield x of statistic.",
        }, {
            "field": "Type",
            "type": "Radio Buttons",
            "required": "Yes",
            "pers": "Yes",
            "details": "Statistics type for subfield a",
        }],
        "errors": [{
            "message": "Couldn't find username from Alma. Is Alma open?",
            "explain": `This message appears when the extension is unable to locate your username on the Alma page. This only occurs\
            when you change your settings to autofill for the cataloguer field. This generally only occurs when Alma is not open in\
            the focussed tab in Chrome. If Alma is open then there may have been an update that causes an error, in which case please e-mail us\
            about the issue (there's a link at the end of this page).`,
        }, {
            "message": "Couldn't find encoding level from Alma. Is Alma open?",
            "explain": `This message appears when the extension is unable to locate the encoding level of the record on the Alma page.\
            This generally only occurs when Alma is not open in the focussed tab in Chrome or if you haven't got the record open.\
            If Alma is open then there may have been an update that causes an error, in which case please e-mail us\
            about the issue (there's a link at the end of this page).`,
        }, {
            "message": "Field can only contain text or dashes",
            "explain": `You have entered invalid characters into one of the fields of input.`,
        }, {
            "message": "Please fill out all fields (note optional)",
            "explain": `You have not filled out every required field.`,
        }],
    }, popup_holder);
    new_booster_card({
        "title": "Invoice Processing",
        "details": `The invoice processing booster allows you to check, receive and review invoices in Alma. The functions \
        search for the invoice by vendor and invoice code and then open the first invoice in the results list\
        (assuming a results list of one, since the vendor-invoice number combination must be unique). Then you\
        will either check, receive or review the invoice depending on what was clicked. The design is meant to minimise keystrokes.\
        The vendor code is persistent, since it is assumed that users are likely to look at invoices from the same vendor at one time.\
        The invoice number, on the other hand, is only persistent after checking an invoice but it cleared after receiving or reviewing an invoice.`,
        "fields": [{
            "field": "Vendor Code",
            "type": "Text",
            "required": "Yes",
            "pers": "Yes",
            "details": "The Alma vendor code for the vendor on the invoice.",
        }, {
            "field": "Invoice Number",
            "type": "Text",
            "required": "Yes",
            "pers": "Depends (see details)",
            "details": "The number of the invoice for which you are looking.",
        }],
        "errors": [{
            "message": "You must supply a vendor and invoice number",
            "explain": `Both fields must be filled out before searching otherwise the list will almost definitely have more than one item`,
        }],
    }, popup_holder);
    new_booster_card({
        "title": "Replace Fund",
        "details": `NOTE: This booster was designed before Ex Libris implemented the replace fund function in Alma. This booster is therefore no longer needed, but is left here in case the design is useful in suggesting workflow solutions to other issues.
        The replace fund booster allows you to quickly add or replace a fund for a particular invoice line.\
        This can be done in one of two ways, either by starting the booster while on the invoice page and specifying a \
        line number or starting it while on an invoice line page in which case it will ignore any line number. Note that\
        this booster assumes that there is at most one fund already associated with an invoice line.`,
        "fields": [{
            "field": "Fund Code",
            "type": "Text",
            "required": "Yes",
            "pers": "Yes",
            "details": `The code of the fund that you want to add to the record. If only a few numbers change then developers\
            can alter built-in functions to add the repeated numbers to the code. For example, for the Harvard Judaica division\
            usually only 3 numbers change within a 35 digit code and so we enter only those 3 digits and the rest of the code is\
            filled in automatically.`,
        }, {
            "field": "Invoice Line",
            "type": "Number",
            "required": "No",
            "pers": "No",
            "details": "The invoice line to which you want to add the fund. Not required if you are already on an invoice line page.",
        }],
        "errors": [{
            "message": "The fund code must be 3, 6 or 35 digits long",
            "explain": `Note the numbers in this error message are subject to what your developer has allowed for expanding fund codes.\
            This errors means that the code you entered was not an allowed length.`,
        }, {
            "message": "You must supply a fund code",
            "explain": `The fund code is required for this booster.`,
        }],
    }, popup_holder);
    new_booster_card({
        "title": "Linking",
        "details": `NOTE: This Booster will only work in the Harvard Library Alma environment, although the technique may be useful to other installations as a model for a booster to construct and add field data.
        The linking booster helps to "link" bibliographic records to a special collection box by adding Harvard local field 929 to the bibliographic record and 977 to the holding record.\
        The first section of the booster page is for inputting the information about the box to which you'll add the records. After this you can use the second section to\
        provide the information about the bibliographic records for the individual items to be linked to the collection box,\
        either by looking them up by MMS ID or by using the record currently on screen. Finally, the\
        third section of the booster page can be used to check that all items have been linked to a box after completion.
        In order to use Macro Express you must create a new script make the trigger a clipboard event that looks for "ALMA-LINKING-ITEM".\
        Then you can start it by pressing the Macro Copy button. The Harvard Library Judaica Division Macro Express script used in conjunction with this Booster is available via GitHub\
        <a target="_blank" class="text-danger" href="https://github.com/hl-judaica-division/hj-alma-booster-macro-express-helper">here</a>.`,
        "fields": [{
            "field": "Box Barcode",
            "type": "Text",
            "required": "Yes",
            "pers": "Yes",
            "details": `The barcode of the box to which records are being linked.`,
        }, {
            "field": "Box MMS ID",
            "type": "Text",
            "required": "Yes",
            "pers": "Yes",
            "details": `The MMS ID of the box to which records are being linked.`,
        }, {
            "field": "Box Type",
            "type": "Dropdown",
            "required": "Yes",
            "pers": "Yes",
            "details": `The type of records that the box contains.`,
        }, {
            "field": "Item Call Number",
            "type": "Text",
            "required": "Yes",
            "pers": "No",
            "details": `The call number of the record that you want to link.`,
        }, {
            "field": "Item MMS ID",
            "type": "Text",
            "required": "Yes",
            "pers": "No",
            "details": `The MMS ID of the record that you want to link.`,
        }, {
            "field": "Box Barcode (Checking)",
            "type": "Text",
            "required": "Yes",
            "pers": "No",
            "details": `The MMS ID of the box that you want to check.`,
        }],
        "errors": [],
    }, popup_holder);
    new_booster_card({
        "title": "API Statistics",
        "details": `THIS IS A BOOSTER IN DEVELOPMENT - It has the same functionality as the Statistics booster described above,\
        but incorporates Alma Write APIs, and will not require Macro Express to assist it, and will also not require the\
        bibliographic and holding records to be open in order for the 920 field to be added to the holding record.`,
        "fields": [],
        "errors": [],
    }, popup_holder);
}

/**
 *
 * Create a new html card for a booster
 * @param {object} info
 * @param {HTMLElement} container
 */
function new_booster_card(info, container) {
    const card = document.getElementById("card_template").cloneNode(true);
    card.classList.remove("hide");
    card.id = "";
    card.querySelector(".script-title").classList.remove("no-menu");
    card.querySelector(".script-title").innerText = info.title;
    card.querySelector(".script-details").innerHTML = info.details;
    let fields = null;
    for (let i = 0; i < info.fields.length; i++) {
        if (fields === null) {
            fields = card.querySelector(".script-fields.hide");
            fields.classList.remove("hide");
        }
        const field = fields.querySelector(".script-fields-row.template").cloneNode(true);
        field.classList.remove("template", "hide");
        field.querySelector(".script-fields-field").innerText = info.fields[i].field;
        field.querySelector(".script-fields-type").innerText = info.fields[i].type;
        field.querySelector(".script-fields-required").innerText = info.fields[i].required;
        field.querySelector(".script-fields-pers").innerText = info.fields[i].pers;
        field.querySelector(".script-fields-details").innerText = info.fields[i].details;
        fields.querySelector(".script-fields-body").appendChild(field);
    }
    if (info.errors.length !== 0) {
        card.querySelector(".error-none").classList.add("hide");
    }
    for (let i = 0; i < info.errors.length; i++) {
        const error = card.querySelector(".error-group.hide").cloneNode(true);
        error.classList.remove("template", "hide");
        error.querySelector(".error-message").innerText = info.errors[i].message;
        error.querySelector(".error-explain").innerText = info.errors[i].explain;
        card.querySelector(".errors-holder").appendChild(error);
    }
    container.appendChild(card);
}

/**
 * Add ids to the header elements
 */
function add_ids() {
    const headers = document.getElementById("content_col").querySelectorAll("h1:not(.no-menu), h2:not(.no-menu), h3:not(.no-menu), h4:not(.no-menu), h5:not(.no-menu), h6:not(.no-menu)");
    for (let i = 0; i < headers.length; i++) {
        if (!headers[i].id) {
            headers[i].id = headers[i].innerText.replace(/\s/g, "_").toLowerCase();
        }
    }
}

/**
 * build the table of contents and place it on the left
 */
function build_table_of_contents() {
    const headers = document.getElementById("content_col").querySelectorAll("h1:not(.no-menu), h2:not(.no-menu), h3:not(.no-menu), h4:not(.no-menu), h5:not(.no-menu), h6:not(.no-menu)");
    const sticky_nav = build_nav_from_list(headers);
    sticky_nav.classList.add("sticky");
    document.getElementById("table_of_contents").appendChild(sticky_nav);
}

/**
 * build nav menu from a list of elements
 * @param  {[type]} list a list of elements
 * @return {[type]}      a nav or subnav
 */
function build_nav_from_list(list) {
    const ul_nav = document.createElement("ul");
    ul_nav.className = "nav flex-column";
    let sub_list = false;
    let i = 0;
    let current_heading = list[i];
    const main_tag = list[0].tagName;
    while (current_heading) {
        sub_list = (current_heading.tagName != main_tag);
        if (sub_list) {
            const smaller_list = [];
            let temp_heading = current_heading;
            if (temp_heading) {
                while (temp_heading.tagName != main_tag) {
                    smaller_list.push(temp_heading);
                    i++;
                    temp_heading = list[i];
                    if (!temp_heading) {
                        break;
                    }
                }
            }
            ul_nav.appendChild(build_nav_from_list(smaller_list));
        } else {
            const new_item = nav_item();
            const new_link = nav_link(current_heading.id, current_heading.innerText);
            new_item.appendChild(new_link);
            ul_nav.appendChild(new_item);
            i++;
        }
        current_heading = list[i];
    }
    return ul_nav;
}

/**
 * create a new nav list element
 * @return {[type]} the element
 */
function nav_item() {
    const new_item = document.createElement("li");
    new_item.classList.add("nav-item");
    return new_item;
}

/**
 * create a nav list
 * @param  {[type]} id   [description]
 * @param  {[type]} text [description]
 * @return {[type]}      [description]
 */
function nav_link(id, text) {
    const new_link = document.createElement("a");
    new_link.classList.add("nav-link");
    new_link.href = "#" + id;
    new_link.innerText = text.replace(" New", "");
    return new_link;
}
