/* ----------------------- Globals ------------------------ */
let key = null;
const api_bases = {
    "get_record": "https://api-na.hosted.exlibrisgroup.com/almaws/v1/bibs",
    "get_invoice_lines": "https://api-na.hosted.exlibrisgroup.com/almaws/v1/acq/invoices/",
    "get_po_line": "https://api-na.hosted.exlibrisgroup.com/almaws/v1/acq/po-lines/",
};
const print_html_shell = `
    <html>
    <head>
        <title>Alma Printout</title>
        <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.0/css/bootstrap.min.css" integrity="sha384-9gVQ4dYFwwWSjIDZnLEWnxCjeSWFphJiwGPXr1jddIhOegiu1FwO5qRGvFXOdJZ4" crossorigin="anonymous">
    </head>
    <body>
        <div class="container-fluid" id="container"></div>
    </body>
    </html>`;

// signature
$(function() {
    console.log(`
||   ||  ||||||||  ||||||   ||||||  ||||||  |||||  |||||| |||||  ||||||
||   ||     ||     ||  ||   ||  ||  ||  ||  ||       ||   ||     ||    
|||||||     ||     |||||||  ||  ||  ||  ||  |||||    ||   ||||   ||    
||   ||     ||     ||   ||  ||  ||  ||  ||     ||    ||   ||     ||    
||   ||  |||||     |||||||  ||||||  ||||||  |||||    ||   |||||  ||    
=======================================================================`);
});

/* ----------------------- Messages ------------------------ */
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.greeting === "add_buttons") {
            add_buttons();
        } else if (request.greeting === "invoice_check" || request.greeting === "invoice_review") {
            invoice_review(request);
        } else if (request.greeting === "invoice_receive") {
            invoice_receive(request);
        } else if (request.greeting === "add_fund") {
            add_fund(request);
        } else if (request.greeting === "linking_set_defaults") {
            linking_set_defaults(request);
        } else if (request.greeting === "linking_get_mms") {
            get_mms_from_callnum(request, sendResponse);
        } else if (request.greeting === "linking_check") {
            linking_check(request);
        } else if (request.greeting === "statistics") {
            stats(request);
        } else if (request.greeting === "introductions") {
            intro(sendResponse);
        } else if (request.greeting === "record_information") {
            md_record_information(sendResponse);
        } else if (request.greeting === "periodicals_set_mmsid") {
            get_mms_from_callnum(request, sendResponse);
        } else if (request.greeting === "edit_record") {
            edit_record(request);
        } else if (request.greeting === "edit_holding_record") {
            edit_holding_record(request);
        } else if (request.greeting === "show_holding_window") {
            create_holding_window(request.desc);
        }
        return true;
    }
);

/* ----------------------- Helper Functions ------------------------ */
/*
================
    Printing
================
*/
/**
 * Print an entire invoice
 * @param  {[string]} id [OPTIONAL], id of invoice to print
 */
function print_invoice(id) {
    $.get(chrome.runtime.getURL("../html/loading.html"), function(response) {
        // create loading screen
        const loading_window = window.open("", 'title', 'directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no,width=550,height=253');
        loading_window.document.write(response);

        // save the invoice id
        const invoice_id = id ? id : document.getElementById("pageBeanuniqueIdentifier").innerText;
        console.log("Invoice Id", invoice_id);

        alma_api_request(api_bases["get_invoice_lines"] + encodeURIComponent(invoice_id), {}, function(detail_xml, status) {
            if (status !== 200) {
                const error = loading_window.document.getElementById("error");
                error.style.display = "block";
                error.querySelector(".alert").innerHTML = "Error retrieving invoice information";
                return;
            }
            loading_window.document.getElementById("vendor").innerText = detail_xml.querySelector("vendor").textContent;
            loading_window.document.getElementById("invoice_number").innerText = detail_xml.querySelector("number").textContent;
        });

        // get the invoice lines
        alma_api_request(api_bases["get_invoice_lines"] + encodeURIComponent(invoice_id) + "/lines", {
            "limit": "100",
        }, function(invoice_xml, invoice_status) {
            console.log("Invoice XML", invoice_xml);
            if (invoice_status !== 200) {
                const error = loading_window.document.getElementById("error");
                error.style.display = "block";
                error.querySelector(".alert").innerHTML = "Error retrieving invoice information";
                return;
            }
            loading_window.document.getElementById("invoice").style.width = "100%";
            loading_window.document.getElementById("invoice").style.width = "100%";

            // get and count lines that can be printed
            const lines = invoice_xml.querySelectorAll("invoice_lines > invoice_line > po_line");
            const good_lines = [];
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].innerHTML !== "") {
                    good_lines.push(lines[i]);
                }
            }
            const line_count = good_lines.length;

            // ask for a PO Line every 100 milliseconds (avoid error by asking too often)
            let mms_ids = [];
            let i = 0;
            const po_loop = setInterval(function() {
                if (i == line_count) {
                    clearInterval(po_loop);
                } else {
                    alma_api_request(api_bases["get_po_line"] + good_lines[i].innerHTML, {}, function(xml, line_status) {
                        // save the MMS ID from the PO Line
                        if (line_status !== 200) {
                            const error = loading_window.document.getElementById("error");
                            error.style.display = "block";
                            error.querySelector(".alert").innerHTML = "Error retrieving invoice line information";
                            return;
                        }
                        mms_ids.push([i, xml.querySelector("po_line > resource_metadata > mms_id").innerHTML]);
                        loading_window.document.getElementById("po_lines").innerText = "Collected " + mms_ids.length + " PO Lines of " + line_count;
                        loading_window.document.getElementById("po_lines").style.width = ((mms_ids.length/line_count)*100).toString() + "%";
                        console.log("PO Line", xml);
                        console.log(mms_ids, line_count);
                    });
                    i++;
                }
            }, 300);
            const mms_loop = setInterval(function() {
                if (mms_ids.length === line_count) {
                    clearInterval(mms_loop);
                    console.log("All MMS IDs received!");
                    mms_ids = mms_ids.sort();
                    print_mms_list(mms_ids, loading_window);
                }
            }, 100);
        });
    }, 'html');
}

function print_mms_list(mms_ids, loading_window) {
    const line_count = mms_ids.length;
    let print_xmls = [];
    let i = 0;
    const record_loop = setInterval(function() {
        if (i == line_count) {
            clearInterval(record_loop);
        } else {
            alma_api_request(api_bases["get_record"], {
                "mms_id": mms_ids[i][1],
            }, function(xml, status) {
                if (status !== 200) {
                    const error = loading_window.document.getElementById("error");
                    error.style.display = "block";
                    error.querySelector(".alert").innerHTML = "Error retrieving record information";
                    return;
                }
                console.log("XML from MMS", xml);
                print_xmls.push([i, xml]);
                loading_window.document.getElementById("bibs").innerText = "Found " + print_xmls.length + " records of " + line_count;
                loading_window.document.getElementById("bibs").style.width = ((print_xmls.length/line_count)*100).toString() + "%";
            });
            i++;
        }
    }, 300);

    const xml_loop = setInterval(function() {
        if (print_xmls.length === line_count) {
            clearInterval(xml_loop);
            console.log("All XML pages received!");
            print_xmls = print_xmls.sort();
            console.log("Record XMLS", print_xmls);

            // create a print page for each record
            let print_pages = [];
            for (let k = 0; k < print_xmls.length; k++) {
                print_api_records(print_xmls[k][1], true, function(page) {
                    console.log("Page for Array", page);
                    print_pages.push([k, page]);
                    loading_window.document.getElementById("prints").innerText = "Created " + print_pages.length + " printouts of " + line_count;
                    loading_window.document.getElementById("prints").style.width = ((print_pages.length/line_count)*100).toString() + "%";
                });
            }
            const page_loop = setInterval(function() {
                if (print_pages.length === line_count) {
                    clearInterval(page_loop);
                    console.log("Page array", print_pages);
                    console.log("All Print Pages Created!");
                    const print_window = window.open("", "Title", "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, width=" + (screen.width) + ", height=" + (screen.height) + ", top=" + (screen.height) + ", left=" + (screen.width));
                    print_window.document.write(print_html_shell);
                    print_pages = print_pages.sort();
                    for (let k = 0; k < print_pages.length; k++) {
                        print_window.document.getElementById("container").appendChild(print_pages[k][1]);
                    }
                    setTimeout(function() {
                        print_window.print();
                        print_window.close();
                        loading_window.close();
                    }, 1000);
                }
            }, 100);
        }
    }, 100);
}

/**
 * Print records from the api xml
 * @param  {[document]} xml [description]
 * @param  {[boolean]}  multi whether multiple pages are being printed
 * @param  {[function]}  callback what to do with the page
 */
function print_api_records(xml, multi = false, callback = null) {
    const records = xml.querySelector("record");
    console.log("About to print:", xml, records);

    // Create the table and style it
    const record_table = document.createElement("table");
    record_table.classList = "table table-bordered table-sm";
    record_table.style.fontSize = "25px";

    // set the MMSID
    let MMSID = "NO BARCODE FOUND";
    const MMSID_box = xml.querySelector("controlfield[tag='001']");
    if (MMSID_box) {
        MMSID = MMSID_box.textContent;
    }

    let OCLC_ref = "";
    const OCLC_boxes = xml.querySelectorAll("datafield[tag='035'] > subfield[code='a']");
    for (let i = 0; i < OCLC_boxes.length; i++) {
        if (OCLC_boxes[i].textContent.substr(0, 7) === "(OCoLC)") {
            OCLC_ref = OCLC_boxes[i].textContent.substr(7);
            break;
        }
    }

    // Add every field to the table
    for (let i = 0; i < records.children.length; i++) {
        record_table.appendChild(row_from_api_record(records.children[i]));
    }

    const page = document.createElement("div");
    page.className = "print_page";
    page.style = "page-break-after: always;";

    const row = document.createElement("div");
    row.className = "row mb-3";

    const barcode_col = document.createElement("div");
    barcode_col.className = "col";

    const barcode_box = document.createElement("h1");
    barcode_box.className = "m-0";
    barcode_box.style = "font-family:CarolinaBar-E39-25E0;font-size:40px; padding-top: 30px; padding-bottom: 30px;";
    barcode_box.innerText = "*" + MMSID + "*";

    const barcode_label = document.createElement("h5");
    barcode_label.className = "m-0";
    barcode_label.innerHTML = "MMS ID: 99<b>" + MMSID.substr(2, 11) + "</b>3941";

    barcode_col.appendChild(barcode_box);
    barcode_col.appendChild(barcode_label);
    row.appendChild(barcode_col);

    // Set the barcode and it's label, same for OCLC
    if (OCLC_ref !== "") {
        const OCLC_col = document.createElement("div");
        OCLC_col.className = "col";

        const OCLC_box = document.createElement("h1");
        OCLC_box.className = "m-0 text-right";
        OCLC_box.style = "font-family:CarolinaBar-E39-25E0;font-size:40px; padding-top: 30px; padding-bottom: 30px;";
        OCLC_box.innerText = "*" + OCLC_ref + "*";

        const OCLC_label = document.createElement("h5");
        OCLC_label.className = "m-0 text-right";
        OCLC_label.innerText = "OCLC Number: " + OCLC_ref;

        OCLC_col.appendChild(OCLC_box);
        OCLC_col.appendChild(OCLC_label);
        row.appendChild(OCLC_col);
    }

    page.appendChild(row);
    page.appendChild(record_table);

    setTimeout(function() {
        if (multi) {
            callback(page);
        } else {
            const print_window = window.open("", "Title", "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, width=" + (screen.width) + ", height=" + (screen.height) + ", top=" + (screen.height) + ", left=" + (screen.width));
            print_window.document.write(print_html_shell);
            print_window.document.getElementById("container").appendChild(page);
            setTimeout(function() {
                print_window.print();
                print_window.close();
            }, 300);
        }
    }, 300);
}

/**
 * Create a html row from the api record field
 * @param  {[element]} field [description]
 * @return {[element]}       [description]
 */
function row_from_api_record(field) {
    const row = document.createElement("tr");
    const tag = document.createElement("td");
    const ind = document.createElement("td");
    const val = document.createElement("td");
    if (field.tagName === "leader") {
        tag.innerText = "LDR";
        val.innerText = field.textContent;
    }
    if (field.tagName === "controlfield") {
        tag.innerText = field.getAttribute("tag");
        val.innerText = field.textContent;
    } else if (field.tagName === "datafield") {
        tag.innerText = field.getAttribute("tag");
        const ind1 = field.getAttribute("ind1") == " " ? "_" : field.getAttribute("ind1");
        const ind2 = field.getAttribute("ind2") == " " ? "_" : field.getAttribute("ind2");
        ind.innerText = ind1 + ind2;
        const subfields = field.children;
        for (let i = 0; i < subfields.length; i++) {
            val.innerText += " |" + subfields[i].getAttribute("code") + " " + subfields[i].textContent;
        }
        val.innnerText = val.innerText.substr(1);
    }
    row.appendChild(tag);
    row.appendChild(ind);
    row.appendChild(val);
    return row;
}

/**
 * Perform an api request to alma
 * @param  {[string]} base_url   The base url for request
 * @param  {[object]} parameters query parameters
 * @param  {Function} callback   handler of the data
 */
function alma_api_request(base_url, parameters, callback) {
    if (key === null) {
        console.log("Retrieving Key");
        chrome.storage.sync.get(["api_key"], function(items) {
            if (items.api_key) {
                key = items.api_key;
                console.log("Key found, starting new run");
                alma_api_request(base_url, parameters, callback);
            } else {
                alert("Unable to retreive API Key");
                return;
            }
        });
        return;
    }
    let url = base_url + "?apikey=" + key;
    for (const [name, value] of Object.entries(parameters)) {
        url += "&" + encodeURIComponent(name) + "=" + encodeURIComponent(value);
    }
    console.log(url);
    chrome.runtime.sendMessage({greeting: "api", url: url}, function(response) {
        console.log(response);
        parser = new DOMParser();
        xml = parser.parseFromString(response.data, "text/xml");
        callback(xml, response.status);
    });
}


/**
 * Add buttons to the Alma pages
 */
function add_buttons() {
    const general_add = document.getElementsByClassName("export")[0];
    const invoice_lines_add = document.getElementById("ADD_HIDERADIO_UPPERACTIONS_up_invoiceLinesList");
    const MD_back = document.getElementById("PAGE_BUTTONS_cbuttonnavigationback");
    const title = document.title;
    const search_print = document.getElementById("RECORD_VIEW_ROW_ID_0");

    if (general_add !== undefined && document.getElementById("judaica_print_button") === null && title === "Record View") {
        const judaica_print_button = inject_button("judaica_print_button", "print", "#12d512");
        general_add.insertBefore(judaica_print_button, document.getElementById("ADD_HIDERADIO_up_marcFieldsList_pagesectionses2sections1widgetList0hdListparametersupperActionslinkActionFields0comboOperationoperationName_ul"));
        document.getElementById("judaica_print_button").addEventListener("click", function() {
            prev_html = this.innerHTML;
            this.innerHTML = "<i class='fa fa-spin fa-circle-notch fa-lg'></i>";
            const mms_id = document.getElementById("pageBeanmmsId").innerText;
            alma_api_request(api_bases["get_record"], {
                "mms_id": mms_id,
            }, function(xml, status) {
                if (status !== 200) {
                    alert("Printing Error");
                    document.getElementById("judaica_print_button").innerHTML = prev_html;
                    return;
                } else {
                    document.getElementById("judaica_print_button").innerHTML = prev_html;
                    console.log(xml);
                    print_api_records(xml);
                }
            });
        });
    } else if (invoice_lines_add !== undefined && document.getElementById("judaica_print_invoice_button") === null && title === "Invoice Details") {
        // Add print all button
        const print_invoice_button = inject_button("judaica_print_invoice_button", "print", "#12d512");
        invoice_lines_add.insertBefore(print_invoice_button, invoice_lines_add.childNodes[0]);
        document.getElementById("judaica_print_invoice_button").addEventListener("click", function() {
            const unique = document.getElementById("pageBeanuniqueIdentifier").innerText;
            print_invoice(unique);
        });
    } else if (MD_back !== null && document.getElementById("judaica_MD_print_button") === null && title === "MD Editor") {
        // Metadata editor buttons
        const MD_print = inject_button("judaica_MD_print_button", "print");
        MD_print.addEventListener("click", function() {
            // go back to previous page
            MD_back.click();

            // wait for the title to change
            const title_loop = setInterval(function() {
                if (document.title !== "MD Editor") {
                    clearInterval(title_loop);
                    const print = function() {
                        wait_for_el("#SELENIUM_ID_marcFieldsList_ROW_0_COL_tag", 7000, function(el) {
                            wait_for_el("#judaica_print_button", 7000, function(el) {
                                el.click();
                            });
                        });
                    };
                    if (document.title === "Record View") {
                        print();
                    } else {
                        wait_for_el("#INITIAL_SPAN_RECORD_VIEW_results_ROW_ID_0_LABEL_title", 7000, function(el) {
                            el.children[0].click();
                            print();
                        });
                    }
                }
            }, 100);
        });
        MD_back.parentElement.insertBefore(MD_print, MD_back);
    } else if (title == "Ex Libris - Alma" && document.getElementById("welcome_booster") === null && document.querySelector(".welcome_second_part") !== null) {
        const new_welcome = document.createElement("div");
        const style = document.createElement("style");
        style.innerText = "#welcome_booster {color: #ef3d13; cursor: pointer} #welcome_booster:hover {text-decoration:underline};";
        new_welcome.className = "welcome_second_part";
        new_welcome.innerHTML = `<div class="welcome_devider">|</div>Boosters Active`;
        new_welcome.id = "welcome_booster";
        new_welcome.addEventListener("click", function() {
            chrome.runtime.sendMessage({
                "greeting": "open_help",
            });
        });
        document.head.appendChild(style);
        document.querySelector(".welcome_second_part").parentElement.appendChild(new_welcome);
    } else if (search_print && document.getElementById("search_print_button") == null) {
        console.log("Search page!");
        const search_print_button = inject_button("search_print_button", "print", "#12d512");
        general_add.insertBefore(search_print_button, document.getElementById("ADD_HIDERADIO_up_marcFieldsList_pagesectionses2sections1widgetList0hdListparametersupperActionslinkActionFields0comboOperationoperationName_ul"));
        document.getElementById("search_print_button").addEventListener("click", function() {
            let num_rec = parseInt(document.querySelector(".listNumOfRecords").innerText.trim().split("-")[1].trim().split(" ")[0]);
            let mms_list = [];
            for (let i = 0; i < num_rec; i++) {
                mms_list.push([i, document.getElementById("SPAN_RECORD_VIEW_results_ROW_ID_" + i.toString() + "_LABEL_mmsIdmmsId").innerText.trim()]);
            }
            console.log(mms_list);
            $.get(chrome.runtime.getURL("../html/loading.html"), function(response) {
                // create loading screen
                const loading_window = window.open("", 'title', 'directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no,width=550,height=253');
                loading_window.document.write(response);
                $(loading_window.document).ready(function() {
                    loading_window.document.getElementById("loading_title").innerText = "Printing Search Page";
                    loading_window.document.querySelectorAll(".invoice-only").forEach(function(item, index) {
                        item.style.display = "none";
                    }); 
                });
                print_mms_list(mms_list, loading_window);
            });
        });
    }
}

/*
================
    Invoices
================
*/
/**
 * receive an invoice
 * @param  {[object]} request the request that was made
 */
function invoice_receive(request) {
    // move to the invoice receiving page if not already there
    if (!document.getElementById("find_poLineList")) {
        document.getElementById("MENU_LINK_ID_comexlibrisdpswrkgeneralmenuAcquisitionPOLinesReceiveNewMarterial").click();
    }

    wait_for_el("#cuireceivingonetime_span", 7000, function(el) {
        // once the one time tab appears, check if it is active
        if (!el.classList.contains("active")) {
            // if not enter a dummy value and click it
            document.getElementById("find_poLineList").value = "RECEIVE CHECK - If this remains for over a minute, error occured in: 'content.js, invoice_receive' ";
            el.children[0].click();
            const search_box_loop = setInterval(function() {
                // wait until loading is done (dummy value gets erased)
                const searchbox = document.getElementById("find_poLineList");
                if (searchbox) {
                    if (searchbox.value === "") {
                        clearInterval(search_box_loop);

                        // set the value and search
                        searchbox.value = request.data.vendor + " " + request.data.number;
                        document.getElementById("search-go-button-poLineList").click();

                        // sort by POLine number
                        wait_for_el("#SELENIUM_ID_poLineList_HEADER_poLinepoLineReference", 7000, function(el) {
                            el.children[0].click();
                        });
                    }
                }
            }, 100);
        } else {
            document.getElementById("find_poLineList").value = request.data.vendor + " " + request.data.number;
            document.getElementById("search-go-button-poLineList").click();
            wait_for_el("#SELENIUM_ID_poLineList_HEADER_poLinepoLineReference", 7000, function(el) {
                el.children[0].click();
            });
        }
    });
}

/**
 * review or check an invoice
 * @param  {[object]} request the request that was made
 */
function invoice_review(request) {
    // review an invoice

    console.log("opening page");
    document.getElementById("MENU_LINK_ID_comexlibrisdpswrkgeneralmenuAcquisitionInvoicesInreviewInvoice").click();

    wait_for_el("#acqpolinelisttabunassigned_span", 7000, function(el) {
        // search by all
        document.getElementById("pagesectionses4sections0widgetList1hdListsearchValue2_hiddenSelect").value = "ALL";

        // remove whatever is currently there
        if (document.getElementById("SELENIUM_ID_invoiceList_ROW_0_COL_invoiceNumber")) {
            document.getElementById("SELENIUM_ID_invoiceList_ROW_0_COL_invoiceNumber").remove();
        }

        // set the value and search
        document.getElementById("find_invoiceList").value = request.data.vendor + " " + request.data.number;
        document.getElementById("search-go-button-invoiceList").click();

        const loading_loop = setInterval(function() {
            if (document.getElementById("loadingBlocker").classList.contains("hide")) {
                clearInterval(loading_loop);
                console.log("done now");

                // once the one time tab appears, check if it is active
                if (!el.classList.contains("active")) {
                    console.log("Not active");
                    document.getElementById("find_invoiceList").value = "";
                    el.children[0].click();

                    const search_box_loop = setInterval(function() {
                        // wait until loading is done (dummy value get's erased)
                        const searchbox = document.getElementById("find_invoiceList");
                        if (searchbox) {
                            if (searchbox.value === request.data.vendor + " " + request.data.number) {
                                clearInterval(search_box_loop);

                                // open the first entry
                                wait_for_el("#SELENIUM_ID_invoiceList_ROW_0_COL_invoiceNumber", 7000, function(el) {
                                    console.log(el.children[0]);
                                    el.children[0].click();
                                    wait_for_el("#acqinvoicewizardinvoice_lines_span", 7000, function(el) {
                                        el.children[0].click();
                                    });
                                });
                            }
                        }
                    }, 100);
                } else {
                    console.log("active");
                    // open the first entry
                    wait_for_el("#SELENIUM_ID_invoiceList_ROW_0_COL_invoiceNumber", 7000, function(el) {
                        el.children[0].click();
                        wait_for_el("#acqinvoicewizardinvoice_lines_span", 7000, function(el) {
                            el.children[0].click();
                        });
                    });
                }
            }
        }, 100);
    });
}

/**
 * create an button to be added to a page
 * @param  {[string]} id   the id for the button
 * @param  {[string]} icon font awesome icon title
 * @return {[htmlbutton]}  completed button
 */
function inject_button(id, icon) {
    const temp = document.createElement("button");
    temp.setAttribute("id", id);
    temp.setAttribute("type", "button");
    temp.style.background = "none";
    temp.style.border = "none";
    temp.innerHTML = "<i class='fa fa-" + icon + " fa-lg'></i>";
    temp.className = "btn btn-link height34";
    temp.style.color = "rgb(128, 0, 0)";
    return (temp);
}

/*
=============
    Funds
=============
*/
/**
 * Add a new fund to an invoice line item by line
 * @param {[object]} request chrome messaging request
 */
function add_fund(request) {
    const title = document.title;

    // check that they are on a valid page
    if (title === "Invoice Details") {
        if (request.fund_data.line == "") {
            alert("Judaica Error: Fund line required");
        }
        document.getElementById("ROW_ACTION_invoiceLinesList_" + (parseInt(request.fund_data.line) - 1).toString() + "_c.ui.table.btn.edit").children[0].click();
        wait_for_el("#widgetId_Left_acqdistributionformadd_fund", 7000, function() {
            // recurse back into this now that we are on the invoice lines details page
            add_fund(request);
        });
    } else if (title === "Invoice Line Details") {
        remove_fund(request);
    } else if (title === "Purchase Order Line Details") {
        add_fund_order(request);
    } else {
        alert("Judaica Error: No invoice or order on screen to add fund to");
    }
}

/**
 * Remove a fund from an invoice line
 * @param  {[object]} request chrome messaging request
 */
function remove_fund(request) {
    // delete fund if it exists
    const deleter = document.getElementById("ROW_ACTION_transactionListUI_0_acq.distribution.list.delete_fund");
    if (deleter) {
        deleter.children[0].click();
    }
    const no_fund_loop = setInterval(function() {
        const no_record = document.querySelectorAll("#transactionListUI > div.typeC2.lightGreyBg.padding15.lightGreyColor.textCenter.marbottom10");
        if (no_record.length > 0) {
            clearInterval(no_fund_loop);
            clearTimeout(no_fund_timeout);
            add_fund_order(request);
        }
    });
    const no_fund_timeout = setTimeout(function() {
        clearInterval(no_fund_loop);
        alert("Judaica Error: More than one fund on original record or other error in deletion");
        return;
    }, 10000);
}

/**
 * Add a new fund to the order that is currently on screen
 * @param {[object]} request chrome messaging request
 */
function add_fund_order(request) {
    document.getElementById("widgetId_Left_acqdistributionformadd_fund").children[0].click();

    const remove_old = document.getElementById("pageBeanfundDescription_reset");
    if (remove_old) {
        remove_old.click();
        desc_loop = setInterval(function() {
            if (document.getElementById("pageBeanfundDescription").value === "") {
                clearInterval(desc_loop);
                finish_replace_fund(request);
            }
            console.log("looking");
        }, 100);
    } else {
        finish_replace_fund(request);
    }
}

/**
 * Finish off replacing the fund on an order
 * @param  {[object]} request chrome messaging object
 */
function finish_replace_fund(request) {
    document.getElementById("PICKUP_ID_pageBeanfundDescription").click();
    const fund_code = expand_fund_code(request.fund_data.code);

    // wait for the iframe to load
    const iframe = document.getElementById("iframePopupIframe");
    iframe.addEventListener("load", function() {
        console.log("fund iframe loaded");
        const self = this;
        self.contentDocument.getElementById("find_fundLedgerList").value = fund_code;
        self.contentDocument.getElementById("search-go-button-fundLedgerList").click();

        // wait for search results to appear
        const fund_search_loop = setInterval(function() {
            const fund_name_link = self.contentDocument.getElementById("SELENIUM_ID_fundLedgerList_ROW_0_COL_fundLedgercode");
            if (fund_name_link.innerText.trim() === fund_code) {
                clearInterval(fund_search_loop);
                console.log("found fund");
                // click the result
                fund_name_link.click();
            }
        }, 100);
    });

    const reset_loop = setInterval(function() {
        const resetbtn = document.getElementById("pageBeanfundDescription_reset");
        if (resetbtn !== null) {
            clearInterval(reset_loop);
            console.log("exec");
            document.getElementById("pageBeantransactionLinepercent").focus();
            document.getElementById("pageBeantransactionLinepercent").value = 100;
            document.getElementById("pageBeantransactionLinepercent").blur();
            console.log("done");
            document.querySelector("#acqdistributionformadd_fund").click();

            wait_for_el("#SPAN_SELENIUM_ID_transactionListUI_ROW_0_COL_transactionLinefundCode", 10000, function(el) {
                document.getElementById("PAGE_BUTTONS_cbuttonsave").click();
            });
        }
    }, 100);
}

/**
 * Expand a 3 or 6 digit fund code into the full version
 * @param  {[string]} code the small code
 * @return {[string]}      full code
 */
function expand_fund_code(code) {
    const len = code.length;
    if (len === 3) {
        return "415.37862..560" + code + ".651123.0000.00000";
    } else if (len === 6) {
        return "415.37862.." + code + ".651123.0000.00000";
    } else {
        return code;
    }
}

/*
================
    Linking
================
*/
/**
 * Simple alma search
 * @param  {[string]} type    the main type of search
 * @param  {[string]} subtype subtype of the search
 * @param  {[string]} text    the search field text
 * @param  {[function]} callback callback function
 */
function alma_simple_search(type, subtype, text, callback) {
    // Get all of the options for type and click the right one
    const options = document.getElementById("simpleSearchObjectType").children;
    for (let i = 0; i < options.length; i++) {
        if (options[i].getAttribute("data-search-label").trim() === type) {
            options[i].querySelector("a").click();
            break;
        }
    }

    // Get all the new suboptions and click the correct one
    const suboptions = document.getElementById("simpleSearchIndexes_hiddenSelect").options;
    for (let i = 0; i < suboptions.length; i++) {
        if (suboptions[i].innerText.trim() === subtype) {
            document.getElementById("simpleSearchIndexes_hiddenSelect").selectedIndex = i;
            break;
        }
    }

    // Insert the search text
    document.getElementById("ALMA_MENU_TOP_NAV_Search_Text").value = text;

    // Submit the search
    document.getElementById("simpleSearchBtn").click();

    if (callback) {
        callback();
    }
}

/**
 * Set defaults for a linking session
 * @param {[object]} request chrome message request
 */
function linking_set_defaults(request) {
    alma_simple_search("All Titles", "MMS ID", request.defaults.MMSID);
    wait_for_el("#INITIAL_SPAN_RECORD_VIEW_results_ROW_ID_0_LABEL_title", 10000, function(el) {
        request.defaults.title = el.innerText;
        chrome.storage.sync.set({
            "linking_defaults": request.defaults,
        }, function() {
            window.location.reload();
        });
    });
}

/**
 * Link an item to a box
 * @param  {[object]} request chrome messaging request
 * @param  {[object]} sendResponse use for sending response
 */
function get_mms_from_callnum(request, sendResponse) {
    // search using the given call number
    alma_simple_search("Physical titles", "Permanent call number", request.callnum);

    // wait for the edit record button to appear
    wait_for_el("#SPAN_RECORD_VIEW_results_ROW_ID_0_LABEL_mmsIdmmsId", 10000, function(mmsbox) {
        setTimeout(function() {
            // check that there isn't more than one record
            console.log(document.querySelector(".listNumOfRecords").innerText.trim());
            if (document.querySelector(".listNumOfRecords").innerText.trim() != "(1 - 1 of 1 )") {
                sendResponse({'mms_id': undefined, 'success': false, 'message': 'I found more than one matching record for that call number. Check the call number is correct and if it is, find the exact MMS ID you want and use that instead.'});
            } else {
                // return the mms id
                sendResponse({'mms_id': mmsbox.innerText, 'success': true});
                window.location.reload();
            }
        }, 500);
    }, function() {
        sendResponse({'mms_id': undefined, 'success': false, 'message': "I can't find a record matching that call number. Did you type it correctly?"});
    });
    return true;
}

/**
 * Check whether the linking succeeded
 * @param  {[object]} request chrome messaging request (contains barcode)
 */
function linking_check(request) {
    const info = document.getElementById("linking_check_info");
    if (info) {
        info.innerHTML = "";
    }

    document.getElementById("simpleSearchObjectType").children[0].click();
    document.getElementById("ALMA_MENU_TOP_NAV_Search_Text").value = "";
    document.getElementById("advancedLink").click();
    document.getElementById("undefined_hiddenSelect_button").click();
    wait_for_el("#undefined_hiddenSelect_list", 5000, function(el) {
        const options = el.children;
        for (let i = 0; i < options.length; i++) {
            if (options[i].innerText === "Local field 929: Non-standard title access") {
                options[i].click();
                break;
            }
        }
        document.getElementById("advSearchDummyText--0--").value = '"linked judaica barcode" ' + request.barcode;
        document.getElementById("advSearchBtn").click();

        const titles = document.querySelector("#breadcrumbs > div.pageTitleWrap.crumbsContainer.btnsLine > span.pageTitle.withSearch > span");
        if (titles) {
            titles.parentElement.removeChild(titles);
        }
        wait_for_el("#breadcrumbs > div.pageTitleWrap.crumbsContainer.btnsLine > span.pageTitle.withSearch > span", 15000, function(el) {
            const total = parseInt(el.innerText.split("of")[1]);
            const info = document.getElementById("linking_check_info");
            if (info) {
                info.innerHTML = "You should have " + total + " linked items!";
            } else {
                const new_span = document.createElement("span");
                new_span.innerHTML = "You should have " + total + " linked items!";
                new_span.style.fontSize = "50px";
                new_span.style.fontWeight = "bold";
                new_span.style.color = "rgb(180, 0, 0)";
                new_span.id = "linking_check_info";
                el.parentElement.appendChild(new_span);
            }
        });
    });
}

/**
 * Save statistics in holding record
 * @param  {[type]} request chrome extension request
 */
function stats(request) {
    // check we are in the Metadata Editor
    if (document.title !== "MD Editor") {
        alert("HJ Booster Error: Can't log statistics on this page");
        return;
    }

    // add the encoding level to the string
    const frame = document.querySelector("iframe");
    const field_920 = request.string;

    // wait for the holding record to appear
    const holding_rec_loop = setInterval(function() {
        const right = frame.contentDocument.getElementById("editorTable-right");
        if (right) {
            if (right.querySelectorAll("textarea").length > 0) {
                clearInterval(holding_rec_loop);
                console.log("ready now");
                right.click();
                const outer_menu = frame.contentDocument.getElementById("additionalSvcsMenuId");
                outer_menu.previousSibling.click();

                const inner_edit_menu = setInterval(function() {
                    const add = frame.contentDocument.getElementById("MenuToolBar.addFieldMenuItem");
                    if (add) {
                        clearInterval(inner_edit_menu);
                        add.click();

                        const new_row_loop = setInterval(function() {
                            const els = frame.contentDocument.querySelectorAll("#editorTable-right .selectedRow > td");
                            if (els.length > 0) {
                                console.log(els);
                                clearInterval(new_row_loop);
                                els[0].querySelector("input").value = "920";
                                els[1].innerText = "1";
                                els[2].innerText = "1";
                                els[3].querySelector("textarea").value = field_920;
                            }
                        }, 100);
                    }
                }, 100);
            }
        }
    }, 100);
}

/**
 * Introduce the application to the user
 * @param  {[type]} reply reply function
 */
function intro(reply) {
    const name = document.querySelector("#ALMA_MENU_TOP_NAV_user_details > button");
    if (!name) {
        alert("Judaica Error: Unable to find Alma name (possibly due to Alma Update), inform supervisor");
        return;
    }
    const user = name.getAttribute("data-original-title");
    const names = user.split(",");
    const username = names[0] + names[1].trim().slice(0, 1);
    console.log(username);
    reply(username);
}

/**
 * Get the encoding level from the current on screen record
 * @param  {[type]} reply reply function
 */
function md_record_information(reply) {
    const iframe = document.querySelector("iframe");
    if (!iframe) {
        console.log("Judaica Error: Unable to find MDEditor");
        reply({"encoding": null, "mms_id": null});
        return;
    }
    const LDR = iframe.contentDocument.getElementById("MarcEditorPresenter.textArea.LDR");
    const mms = iframe.contentDocument.getElementById("MarcEditorPresenter.textArea.001");
    if (!LDR) {
        console.log("Judaica Error: Unable to find LDR in MDEditor");
        reply({"encoding": null, "mms_id": null});
        return;
    }
    if (!mms) {
        console.log("Judaica Error: Unable to find mms in MDEditor");
        reply({"encoding": null, "mms_id": null});
        return;
    }
    const encoding_level = LDR.querySelector("textarea").value.substring(17, 18);
    console.log(encoding_level);
    const mms_id = mms.querySelector("textarea").value;
    console.log("about to send this", {"encoding": encoding_level, "mms_id": mms_id});
    reply({"encoding": encoding_level, "mms_id": mms_id});
    return;
}

function edit_record(request) {
    alma_simple_search("Physical Titles", "MMS ID", request.mms, function() {
        wait_for_el("#INITIAL_SPAN_RECORD_VIEW_results_ROW_ID_0_LABEL_title > a", 10000, function(el) {
            el.click();
            wait_for_el("#PAGE_BUTTONS_cbuttonedit", 10000, function(butt) {
                butt.click();
            });
        });
    });
}

function edit_holding_record(request) {
    multiple_holdings = true;
    alma_simple_search("Physical Titles", "MMS ID", request.mms, function() {
        wait_for_el("#record_1_results > div > div.tabsContainer > div.tabsContainerNotExpanded > div:nth-child(1) > div > div > ul > li.tab.hasContentInd.hasContent.jsToolTip.closeOnClick.scrollInit > a", 10000, function(el) {
            el.click();
            console.log(parseInt(el.innerText.trim().split("(")[1].split(")")[0]))
            if (parseInt(el.innerText.trim().split("(")[1].split(")")[0]) == 1) {
                multiple_holdings = false;
            }
            wait_for_el("#ADD_HIDERADIO_results_0_inventoryLookAheadphysicalUiHoldingResults_csearchbib_resultsnav_pane_physical_upper_actions_holdings > div > a", 2000, function(holding_btn) {
                holding_btn.click();
                if (multiple_holdings) {
                    wait_for_el("#SELENIUM_ID_listWithFilters_ROW_0_COL_pid", 10000, function(col) {
                        let i = 0;
                        while (col && col.innerText != request.holding) {
                            i += 1;
                            col = document.querySelector("#SELENIUM_ID_listWithFilters_ROW_" + i.toString() + "_COL_pid");
                        }
                        if (col) {
                            console.log("Found it in row", i);
                            col.children[0].click();
                            wait_for_el("#PAGE_BUTTONS_cbuttonedit", 10000, function(edit) {
                                edit.click();
                            });
                        } else {
                            alert("Could not find matching holding record");
                        }
                    });
                } else {
                    wait_for_el("#PAGE_BUTTONS_cbuttonedit", 10000, function(edit) {
                        edit.click();
                    });
                }
            });
        });
    });
}

function create_holding_window(description) {
    let win = window.open('', '_blank', 'width=300,height=120,toolbar=0,location=0,menubar=0');
    win.document.write(`
    <!DOCTYPE html>
    <html class="h-100">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
            <title>Periodicals Information</title>
            <link rel="stylesheet" type="text/css" href="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css">
        </head>    
        <body class="h-100">
            <div class='container-fluid h-100 py-2'>
                <div class="row h-100">
                    <div class="col h-100 text-center">
                        <textarea id="box" class="w-100"></textarea>
                        <div class="btn-group">
                            <button id="copy" class="btn btn-danger">Copy</button>
                            <button id="close_copy" class="btn btn-danger">Close and Copy</button>
                        </div>
                    </div>
                </div>
            </div>
            <script>
            document.getElementById("box").value = "` + description + `";
            document.getElementById("copy").addEventListener("click", function() {
                console.log("yoohoo");
                document.getElementById("box").select();
                document.execCommand("copy");
            });
            document.getElementById("close_copy").addEventListener("click", function() {
                document.getElementById("copy").click();
                close();
            });
            document.getElementById("close_copy").focus();
            </script>
        </body>
    </html>`);
}