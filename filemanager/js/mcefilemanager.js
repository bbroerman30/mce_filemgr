(function() {
window.mceFileManager = {
    document_base_url : null,
    baseURL : null,
    
    preInit : function() 
    {
        var baseDir = document.location.href;

        if (baseDir.indexOf('?') != -1)
            baseDir = baseDir.substring(0, baseDir.indexOf('?'));

        baseDir = baseDir.substring(0, baseDir.lastIndexOf('/') + 1);

        this.document_base_url = unescape(baseDir);
    },

    // Existance needed for displaying button o
    filebrowserCallBack : function(field_name, url, type, win) 
    {
        if( type != 'image' )
            return;
            
        // Open browser
        this.open(url, function(url) {
            mceFileManager.insertFileToTinyMCE(win, field_name, url, null);
        });

        return true;
    },

    insertFileToTinyMCE : function(callerwindow, field, url, info) 
    {
        var url;
        var f = callerwindow.document.forms[0];
        var names = ['alt', 'title', 'linktitle'];
        var i;
        

        // Set URL
        f.elements[field].value = url;

        // Set alt and title info
        if (info && info.custom && info.custom.description) 
        {
            for (i=0; i<names.length; i++) 
            {
                if (f.elements[names[i]])
                    f.elements[names[i]].value = info.custom.description;
            }
        }

        // Try to fire the onchange event
        try 
        {
            f.elements[field].onchange();
        } 
        catch (e) 
        {
            // Skip it
        }

    },  

    open : function(file_url, callback_pointer) 
    {
        var x, y, w, h;

        w = 540;
        h = 360;
        x = parseInt(screen.width / 2.0) - (w / 2.0);
        y = parseInt(screen.height / 2.0) - (h / 2.0);

        if (document.attachEvent) 
        {
            // Pesky MSIE + XP SP2
            w += 15;
            h += 35;
        }

	    tinyMCE.activeEditor.windowManager.open({
            file : this.getBaseURL() + '/filemanager.htm',
            title : 'Browse Server',
            width : w,  // Your dimensions may differ - toy around with them!
            height : h,
            resizable : "yes",
            inline : "yes",  // This parameter only has an effect if you use the inlinepopups plugin!
            close_previous : "no"
        }, {
            curr_file: file_url,
            callback: callback_pointer
        } );
    },
    
    getBaseURL : function() {
        if (this.baseURL)
            return this.baseURL;

        // If loaded using TinyMCE 3.x and XHR requests
        if (window.tinymce && tinymce.PluginManager && tinymce.PluginManager.urls['filemanager'])
            return this.baseURL = tinymce.PluginManager.urls['filemanager'];
        else
            return this.baseURL = this.findBaseURL(/mcefilemanager\.js/g);            
    },
    
    findBaseURL : function(k) {
        var o, d = document;

        function get(nl) 
        {
            var i, n;

            for (i=0; i<nl.length; i++) 
            {    
                n = nl[i];

                if (n.src && k.test(n.src))
                    return n.src.substring(0, n.src.lastIndexOf('/'));
            }
        };

        o = d.documentElement;
        if (o && (o = get(o.getElementsByTagName('script'))))
            return o;

        o = d.getElementsByTagName('script');
        if (o && (o = get(o)))
            return o;

        o = d.getElementsByTagName('head')[0];
        if (o && (o = get(o.getElementsByTagName('script'))))
            return o;

        return null;
    }    
};

mceFileManager.preInit();
})();