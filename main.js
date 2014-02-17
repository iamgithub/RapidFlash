// Get access to the background window object
// This object is used to pass current connectionId to the backround page
// so the onClosed event can close the port for us if it was left opened, without this
// users can experience weird behavior if they would like to access the serial bus afterwards.
chrome.runtime.getBackgroundPage(function(result) {
    backgroundPage = result;
    backgroundPage.app_window = window;
});

$(document).ready(function() {
    PortHandler.initialize();
    
    // alternative - window.navigator.appVersion.match(/Chrome\/([0-9.]*)/)[1];
    GUI.log('Running - OS: <strong>' + GUI.operating_system + '</strong>, ' + 
        'Chrome: <strong>' + window.navigator.appVersion.replace(/.*Chrome\/([0-9.]*).*/,"$1") + '</strong>, ' +
        'Flasher: <strong>' + chrome.runtime.getManifest().version + '</strong>');
    
    var e_firmware = $('select#firmware');
    for (var i = 0; i < firmware_type.length; i++) {
        e_firmware.append('<option value="' + firmware_type[i] + '">' + firmware_type[i] + '</option>');
    }
    

    $('a.load').click(function() {
        chrome.fileSystem.chooseEntry({type: 'openFile', accepts: [{extensions: ['hex']}]}, function(fileEntry) {
            if (!fileEntry) {
                // no "valid" file selected/created, aborting
                console.log('No valid file selected, aborting');
                return;
            }
            
            chrome.fileSystem.getDisplayPath(fileEntry, function(path) {
                console.log('Loading file from: ' + path);
                
                fileEntry.file(function(file) {
                    var reader = new FileReader();
                    
                    reader.onprogress = function(e) {
                        if (e.total > 1048576) { // 1 MB
                            // dont allow reading files bigger then 1 MB
                            console.log('File limit (1 MB) exceeded, aborting');
                            GUI.log('File limit (1 MB) <span style="color: red">exceeded</span>, aborting');
                            reader.abort();
                        }
                    };
                    
                    reader.onloadend = function(e) {
                        if (e.total != 0 && e.total == e.loaded) {
                            console.log('File loaded');
                            
                            // parsing hex in different thread
                            var worker = new Worker('./js/workers/hex_parser.js');
                            
                            // "callback"
                            worker.onmessage = function (event) {
                                parsed_hex = event.data;
                                
                                if (parsed_hex) {
                                } else {
                                    GUI.log('HEX file appears to be <span style="color: red">corrupted</span>');
                                }
                            };
                            
                            // send data/string over for processing
                            worker.postMessage(e.target.result);
                        }
                    };

                    reader.readAsText(file);
                });
            });
        });
    });
    
    $('a.save').click(function() {
    });
    
    $('a.flash').click(function() {
        if (!GUI.connect_lock) {
            /*
            $.get("./test_fw/bs_nfet.hex", function(result) {
                // parsing hex in different thread
                var worker = new Worker('./js/workers/hex_parser.js');
                
                // "callback"
                worker.onmessage = function (event) {
                    parsed_hex = event.data;
                    
                    beging_upload(parsed_hex);
                };
                
                // send data/string over for processing
                worker.postMessage(result);
            });
            */
        }
    });
    
    var beging_upload = function(hex) {
        switch($('select#programmer').val()) {
            case 'turnigy_usb_linker':
                STK500V2.connect(9600, hex);
                break;
            case 'arduino_usb_linker':
                STK500V2.connect(19600, hex);
                break;
        }
    };
});