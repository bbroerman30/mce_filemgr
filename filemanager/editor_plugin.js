/**
 * $Id: editor_plugin_src.js 42 2006-08-08 14:32:24Z spocke $
 *
 * @author Moxiecode
 * @copyright Copyright © 200  4-2007, Moxiecode Systems AB, All rights reserved.
 */

(function() 
 {
     function getParam(n, d) 
     {
         if (tinyMCE.getParam)
             return tinyMCE.getParam(n, d);
         else
             return tinyMCE.activeEditor.getParam(n, d);
     };
 
     var TinyMCE_FileManagerPlugin = {
         getInfo : function() 
         {
             return {
                longname : 'MCEFileManager PHP',
                author : 'Brad Broerman',
                authorurl : 'http://www.bbroerman.net', 
                infourl : 'http://www.bbroerman.net',
                version : "1.0"
             };
         },
 
         initInstance : function(inst) 
         {
             inst.settings['file_browser_callback'] = 'mceFileManager.filebrowserCallBack';
         },
   
         _init : function() 
         {
             var p = TinyMCE_FileManagerPlugin;
             var base = (tinymce.PluginManager.urls['filemanager'] || (tinymce.baseURL + '/plugins/filemanager'));
 
             tinymce.ScriptLoader.load( base + '/js/mcefilemanager.js');
 
             if (window.mceFileManager)
                 mceFileManager.baseURL = base + '/js';
 
             tinymce.create('tinymce.plugins.FileManagerPlugin', {
                 FileManagerPlugin : function(ed, url) {
                     ed.onInit.add(function() {
                         p.initInstance(ed);
                     });
 
                     this.editor = ed;
                 },
 
                 getInfo : function() {
                     return TinyMCE_FileManagerPlugin.getInfo();
                 }
             });
  
             tinymce.PluginManager.add('filemanager', tinymce.plugins.FileManagerPlugin);
         },
 
         _loadScript : function(u) 
         {
             var s, d = document;
             document.write('<script type="text/javascript" src="' + u + '"></script>');
         }
     };
 
     TinyMCE_FileManagerPlugin._init();
     
 })();
 