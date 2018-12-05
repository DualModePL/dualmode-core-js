var App = {
    initialFunctions: [],
    initialAfterAjaxFunctions: [],
    handleAjaxError: function (xhr, status, error) {
        if (xhr.status == 401) {
            window.location.href = '/login';
        }
    },
    registerInitial: function (func, initAfterAjaxRequest) {
        var self = App;

        var initAfterAjaxRequest = typeof(initAfterAjaxRequest) === 'undefined' ? true : initAfterAjaxRequest;
        self.initialFunctions.push(func);
        if (initAfterAjaxRequest) {
            self.initialAfterAjaxFunctions.push(func);
        }
    },

    init: function () {
        var self = App;
        $(document).ready(function () {
            console.log('--App.init start--');
            for (i in self.initialFunctions) {
                var func = self.initialFunctions[i];
                if (typeof(func) === 'function') {
                    func();
                }
            }

            console.log('--App.init done--');
        });


    },

    initAfterAjax: function () {
        var self = App;
        for (i in self.initialAfterAjaxFunctions) {
            var func = self.initialAfterAjaxFunctions[i];
            if (typeof(func) === 'function') {
                func();
            }
        }
    },

    loadingOverlay: {
        show: function(selector) {
            if ($.isFunction($().LoadingOverlay)) {
                var selector = selector || null;
                if(null !== selector) {
                    $(selector).LoadingOverlay("show");
                } else {
                    if(App.loadingOverlay.enabled) {
                        $.LoadingOverlay("show");
                    }
                }
            }
        },

        hide: function() {
            if ($.isFunction($().LoadingOverlay)) {
                var selector = selector || null;
                if(null !== selector) {
                    $(selector).LoadingOverlay("hide");
                } else {
                    if(App.loadingOverlay.enabled) {
                        $.LoadingOverlay("hide");
                    }
                }
            }
        },

        setStatus: function(status) {
            App.loadingOverlay.enabled = status;
        },
        enabled: true
    }
}

var Core = {
    init: function () {
        var self = Core;

        $( document ).ajaxError(function (event, xhr) {
            if (xhr.status == 401) {
                window.location.href = '/login';
            }
        });
        self.initAjaxForm();
        self.initAjaxLinks();
        self.datatables();
        self.datetimepicker();
        self.multiselects();
        self.initClipboardJS();
        self.initBootstrapToggle();
    },

    initBootstrapToggle: function() {
        if ($.isFunction($().bootstrapToggle)) {
            $('[data-toggle="toggle"]').bootstrapToggle();
        }
    },

    initClipboardJS: function() {
        if(typeof ClipboardJS !== 'undefined') {
            if(ClipboardJS.isSupported()) {
                new ClipboardJS('.fn-clipboard-copy').on('success', function(event) {
                    if($.isFunction($().tooltip)) {
                        var target = $(event.trigger);
                        target.attr('title', 'copied');
                        target.tooltip().on( "tooltipclose", function() {
                            target.tooltip();
                            target.tooltip('destroy');
                            target.removeAttr('title');
                        });
                        target.tooltip('open');
                    }
                });
            } else {
               $('.fn-clipboard-copy').addClass('hidden');
            }
        }
    },

    mergeOptions: function (obj1, obj2) {
        var obj3 = {}
        for (var attrname in obj1) {
            obj3[attrname] = obj1[attrname]
        }
        for (var attrname in obj2) {
            obj3[attrname] = obj2[attrname]
        }
        return obj3
    },

    datatables: function () {
        var defaultOptions = {
            'bLengthChange': true,
            'pageLength': 25,
            'bFilter': true,
            'stateSave': true,
            'aoColumnDefs': [{
                'bSortable': false,
                'aTargets': ['dt-nosort']
            }]
        };

        if ($.isFunction($().DataTable)) {
            $('.datatable').each(function () {
                var inst = $(this);
                if ( ! $.fn.DataTable.isDataTable( inst ) ) {
                    inst.DataTable(defaultOptions);
                }
            });
        }
    },
    multiselects: function () {
        if ($.isFunction($().multiSelect)) {
            $('.multiselect').multiSelect();
        } else {
            console.log('multiSelect function is missing')
        }
    },

    datetimepicker: function () {
        if ($.isFunction($().datetimepicker)) {
            $('.datetimepicker').datetimepicker({
                format: 'yyyy-mm-dd hh:ii'
            })
        } else {
            console.log('datetimepicker function is missing')
        }

        if ($.isFunction($().datepicker)) {
            $('.datepicker').datepicker({
                dateFormat: 'yy-mm-dd'
            })
        } else {
            console.log('datepicker function is missing')
        }
    },

    ajaxRequest: function (options) {
        var self = Core;
        var defaultOptions = {
            'method': 'post',
            'success': ResponseProcessor.process,
            'data': {},
            'processData': true,
            'contentType': 'application/x-www-form-urlencoded; charset=UTF-8'
        }

        var finalOptions = self.mergeOptions(defaultOptions, options)

        try {
            if (typeof finalOptions.url === 'undefined') {
                throw 'Missing param "url"'
            }

            if (typeof finalOptions.data === 'undefined') {
                throw 'Missing param "data"'
            }
        } catch (err) {
            console.log(err)
            return false
        }

        App.loadingOverlay.show();

        return $.ajax({
            'url': finalOptions.url,
            'data': finalOptions.data,
            'method': finalOptions.method,
            'type': 'json',
            'processData': finalOptions.processData,
            'contentType': finalOptions.contentType,
            'success': function (response) {
                try {
                    finalOptions.success(response);
                    App.initAfterAjax();
                } catch (err) {
                    // console.log(err)
                }
            },
            'complete': function(jqXHR) {
                ResponseProcessor.handleErrors(jqXHR);
                App.loadingOverlay.hide();

            },
            'headers': {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            }
        })
    },

    initAjaxForm: function () {
        $('form.ajax-form').off('submit.ajax-form').on('submit.ajax-form', this.handleAjaxSubmit);
    },

    initAjaxLinks: function () {
        $('.ajax-link').off('click.ajax-link').on('click.ajax-link', this.handleAjaxLink);
    },

    handleAjaxLink: function (e) {
        var self = Core;
        e.preventDefault();
        var inst = $(this)
        var href = inst.prop('href') || inst.data('href')

        var method = inst.data('method')
        var confirmText = inst.data('confirm')
        if (confirmText !== undefined) {
            if (!confirm(confirmText)) {
                return false
            }
        }
        if (method === undefined || method !== 'post') {
            method = 'get'
        }

        var params = {
            'url': href,
            'data': {},
            'method': method
        };

        var callback = eval(inst.data('callback'));
        if(typeof(callback) === 'function') {
            params.success = callback;
        }

        self.ajaxRequest(params)
    },

    handleAjaxSubmit: function (e) {
        var self = Core;
        e.preventDefault();
        var inst = $(this)

        var method = inst.prop('method')
        if (method === undefined || method !== 'post') {
            method = 'get'
        }

        var action = inst.prop('action')
        // var data = inst.serialize()
        var data = new FormData(inst[0]);

        var params = {
            'url': action,
            'data': data,
            'method': method,
            'processData': false,
            'contentType': false
        };

        var callback = eval(inst.data('callback'));
        if(typeof(callback) === 'function') {
            params.success = callback;
        }

        self.ajaxRequest(params);
    },
    DOMObjectToHTML: function(object) {
        return object.clone().wrap('<div/>').parent().html();
    }
}

var ResponseProcessor = {
    process: function (response) {
        for (method in response) {
            details = response[method];
            ResponseProcessor.processMethod(method, details);
        }
    },

    processMethod: function (method, details) {
        methods = ['remove'];
        if (methods.indexOf(method) > -1) {
            for (var key in details) {
                selector  = details[key];
                $(selector)[method]();
            }
        }

        methods = ['html', 'replaceWith', 'prepend', 'insertBefore', 'insertAfter', 'before', 'after', 'append'];
        if (methods.indexOf(method) > -1) {
            for (var key in details) {
                $(key)[method](details[key]);
            }
        }

        if (method == 'modal') {
            for (var key in details) {
                $(key + ' .modal-body').html(details[key]);
                $(key).modal('show');
            }
        }

        if(method === 'modalForm') {
            // console.log(method, details);
            for (var key in details) {
                var modalKey = '.modal.fn-modal-form';
                $('.modal-backdrop').remove();
                $(modalKey).remove();

                $('body').append(details[key]);
                $(modalKey).modal('show');

                $(modalKey).on('hidden.bs.modal', function () {
                    $(this).remove();
                });
            }
        }

        if (method == 'closeModal') {
            $(details + '.modal').modal('hide');
        }

        if (method == 'call') {
            eval(details);
        }

        if (method == 'redirect') {
            window.location.href = details;
        }
    },

    handleErrors: function(jqXHR) {
        $('.fn-modal-form').find('.is-invalid').removeClass('is-invalid');
        if(jqXHR.status === 422 && typeof jqXHR.responseJSON.errors !== 'undefined') {
            for(var fieldName in jqXHR.responseJSON.errors) {
                $(':input[name="'+ fieldName +'"]').addClass('is-invalid');
                var validationContainer = $('.fn-validation-error[data-field="'+ fieldName +'"]');
                if(validationContainer.length) {
                    validationContainer.text(jqXHR.responseJSON.errors[fieldName][0]);
                }

                break;
            }
        }
    }
}

App.registerInitial(Core.init);