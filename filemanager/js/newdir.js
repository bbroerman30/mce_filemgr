var NewDirDialog = {

    refreshFn : null,

	init : function(ed) {
        this.refreshFn = tinyMCEPopup.getWindowArg("refreshFn");

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

tinyMCEPopup.onInit.add(NewDirDialog.init, NewDirDialog);
