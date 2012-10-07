var RenameDialog = {

    refreshFn : null,

	init : function(ed) {
		var ed = tinyMCEPopup.editor, t = this, f = document.forms[0];
		
        this.refreshFn = tinyMCEPopup.getWindowArg("refreshFn");
        
        f.name.value = tinyMCEPopup.getWindowArg("origname");
		
		tinyMCEPopup.resizeToInnerSize();
    },
    
	insert : function(file, title) {
		var ed = tinyMCEPopup.editor, t = this, f = document.forms[0];

		if (f.name.value.length > 0) {
 
            this.refreshFn( f.name.value );

			tinyMCEPopup.close();
			return;
		}
    }
};

tinyMCEPopup.onInit.add(RenameDialog.init, RenameDialog);
