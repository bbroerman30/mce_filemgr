var FileMgrDialog = {

  _baseDir : null,              // Base directory to use for popup dialogs (rename, etc.)
  _callbackFn : null,           // The callback we call to insert the file into the advimage plugin window (uses _form, and _formElement).
  _origFilename : "",           // The original image file URL (if any).
  _httpBaseImageDir : "",       // Base directory relative URL.
  _currDirectory : "/",         // Contains a the current directory path.
  _fileList : "",               // List of files to be uploaded.
  _currSecurityKey : "",        // Used to track the current security key expected by the browser server.
  _indexFirstShiftclick : null, // Index of the element clicked on with the shift key. 
  _objRightClicked : null,      // Pointer to the object the mouse was over when a right-click occurred.

  init : function(ed) {

    this._callbackFn = tinyMCEPopup.getWindowArg("callback");
    this._origFilename = tinyMCEPopup.getWindowArg("curr_file");

    tinyMCEPopup.resizeToInnerSize();
    this.processResize();
    this.refresh();

    var that = this;
    this._setEventListener(document.getElementById('dirlist'), 'onmousedown', function(e){that._rightclick(e);});
    this._setEventListener(document.getElementById('treeview'),'onmousedown', function(e){that._rightclick(e);});
    
    document.oncontextmenu = function() {return false;};
  },
  
    getBaseURL : function() {
        if (this._baseUrl)
            return this._baseUrl;

        // If loaded using TinyMCE 3.x and XHR requests
        if (window.tinymce && tinymce.PluginManager && tinymce.PluginManager.urls['filemanager'])
            return this._baseUrl = tinymce.PluginManager.urls['filemanager'];
        else
            return this._baseUrl = this.findBaseURL(/mcefilemanager\.js/g);            
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
    },

  insert : function(filename) {

      //
      // Either we are called with a filename, or we have to search through the file display for the 1st
      // selected file. Eiter way, we return the file to tinyMCE using the callback passed into this
      // window...
      //
      if( filename == undefined || filename == null || filename == "" )
      {
          var list = document.getElementById('dirlist').getElementsByTagName('div');
          for( var i = 0; i < list.length; ++i )
          {
              if( list[i].className && list[i].className == 'selected' )
              {
                  filename = this._httpBaseImageDir + list[i].childNodes[0].getAttribute("path");
                  break;
              }
          }
      }
      
      this._callbackFn( filename );  

      tinyMCEPopup.close();
      return;
  },

  lastHeight : null,
  
  processResize : function () 
  {
      var myHeight = 0;
      if( typeof( window.innerHeight ) == 'number' ) 
      {
          //Non-IE
          myHeight = window.innerHeight;
      } 
      else if( document.documentElement && ( document.documentElement.clientHeight ) ) 
      {
          //IE 6+ in 'standards compliant mode'
          myHeight = document.documentElement.clientHeight;
      } 
      else if( document.body && ( document.body.clientHeight ) ) 
      {
          //IE 4 compatible
          myHeight = document.body.clientHeight;
      }
      
      if( this.lastHeight == null )
          this.lastHeight = myHeight;
      
      var deltaSize = myHeight - this.lastHeight;
  
     try 
     {     
         // resize the browser window to be the proper height...
         document.getElementById('treeview').style.height = 
             ( this.getComputedStyle( document.getElementById('treeview'), "height") + deltaSize ) + "px";
     
         document.getElementById('dirlist').style.height =      
             ( this.getComputedStyle( document.getElementById('dirlist'), "height") + deltaSize ) + "px";     
     } 
     catch( e ) 
     {
         // For IE, for some reason, the above doesn't always work... We can safely ignore in this case.
     }
     
     this.lastHeight = myHeight;
  },

  getComputedStyle : function (el,styleProp)
  {
      var y = null;
	
	  if ( el.currentStyle )
	  {
	      styleProp = styleProp.replace(/\-(\w)/g, function (strMatch, p1) {
			                                         return p1.toUpperCase(); });

	      y = el.currentStyle[styleProp];
      }
	  else if (window.getComputedStyle)
	  {
	      y = document.defaultView.getComputedStyle(el,null).getPropertyValue(styleProp);
      }
		
	  return parseInt(y);
   },

  refresh : function () {
         var params = "action=listDirs";
         var that = this;

         this._sendAjaxRequest( params , function(responseXML) {

            that._populateDirTree(responseXML);

            //
            // TODO: Scroll to the current directory. expand it if it has children and is collapsed
            // This is most useful in a refresh situation (add a directory, or click refresh).
            //

            if( that._currDirectory != null )
            {
                that.selectDir(that._currDirectory)
            }
            else
            {
                that.selectDir("/");
            }
     } );

  },

  getFileList : function() {
    if( document.ftpappl && 
        document.ftpappl.isActive && 
        document.ftpappl.isActive() && 
        document.ftpappl.setPercentCallBack ) { 
      document.ftpappl.setPercentCallBack( "FileMgrDialog._setPercent" );
      document.ftpappl.setFilePercentCallBack( "FileMgrDialog._setFilePercent" );
      document.ftpappl.setStatusCallBack( "FileMgrDialog._setStatus" );
      document.ftpappl.setFileCompleteCallBack( "FileMgrDialog._finished" );
      document.ftpappl.setFtpCompleteCallBack( "FileMgrDialog._allfinished" );
      document.ftpappl.setFileSelectCallBack( "FileMgrDialog._setFilesSelected" );
  
      document.ftpappl.getFiles(true);
    } else {
      this.fileUploadByForm();        
    }
  },

  fileUploadByForm : function() {
    var that = this;

    // Show popup for directory name (popup will call callback to initiate a refresh).
    tinyMCE.activeEditor.windowManager.open({
          file : that.getBaseURL() + '/formfileupload.htm',
          title : 'Upload a file',
          width : 330,  // Your dimensions may differ - toy around with them!
          height : 80,
          resizable : "no",
          inline : "yes",  // This parameter only has an effect if you use the inlinepopups plugin!
          close_previous : "no"
      }, {
          refreshFn : function(response) {
            if( "success" != response ) {
              tinyMCE.activeEditor.windowManager.alert('File upload failed: ' + response );
            } else {
              that.refresh();
            }         
          }
      });
  },

  addDirectory : function() {
      var that = this;

      // Show popup for directory name (popup will call callback to initiate a refresh).
      tinyMCE.activeEditor.windowManager.open({
            file : that.getBaseURL() + '/newdir.htm',
            title : 'New Directory',
            width : 330,  // Your dimensions may differ - toy around with them!
            height : 80,
            resizable : "no",
            inline : "yes",  // This parameter only has an effect if you use the inlinepopups plugin!
            close_previous : "no"
        }, {
            refreshFn : function(dirpathname) {
               var params = "";

               if ( dirpathname.length > 0)
               {

                   if( dirpathname.indexOf( that._currDirectory ) != 0 )
                   {
                       if( that._currDirectory != "/" )
                       {
                           dirpathname = that._currDirectory + "/" + dirpathname;
                       }
                       else
                       {
                           dirpathname = "/" + dirpathname;
                       }
                   }

                   params = "action=addFolder&path=" + dirpathname ;

                   that._sendAjaxRequest( params , function(responseXML)
                   {
                       var failedNodeList = responseXML.getElementsByTagName('failed');

                       if( failedNodeList.length > 0 )
                       {
                           tinyMCE.activeEditor.windowManager.alert('Add Directory Failed:' + that._getTextNode(failedNodeList[0]) );
                       }
                       else
                       {
                           that.refresh();
                       }
                   } );
               }

            }
        });
  },

  fileCopy : function() {
      // find all selected items. Place the names (and paths) into a buffer (array of object)
        var list = document.getElementById('dirlist').getElementsByTagName('div');
        var filecount = 0;

        this._fileList = "COPY";
        

        for( var i = 0; i < list.length; ++i )
        {
            if( list[i].className && list[i].className == 'selected' )
            {
                var currFile = list[i].childNodes[0].getAttribute("path");
                filecount += 1;
                
                this._fileList += "|" + currFile;
            }
        }
        
        if( filecount == 0 && this._objRightClicked )
        {
            this._fileList += "|" + this._objRightClicked.getAttribute("path");
        }
  },

  filePaste : function() {
       var params = "action=paste";
         var that = this;

         if (this._fileList.substring(0,4) =='COPY')
         {
             params = "action=copy&folder=" + this._currDirectory +
                       "&files=" + this._fileList.substring(5) ;
         }

         else if (this._fileList.substring(0,3) =='CUT')
         {
             params = "action=paste&folder=" + this._currDirectory +
                       "&files=" + this._fileList.substring(4) ;
         }

         this._sendAjaxRequest( params , function(responseXML)
         {
             var failedNodeList = responseXML.getElementsByTagName('failed');

             if( failedNodeList.length > 0 )
             {
                 tinyMCE.activeEditor.windowManager.alert('Paste Failed:' + that._getTextNode(failedNodeList[0]) );
             }
             else
             {
                  that.refresh();
             }
         } );
  },

  fileDelete : function() {
      var that = this;
        var list = document.getElementById('dirlist').getElementsByTagName('div');
        var fileList = "";
        var countOfFile = 0;

        for( var i = 0; i < list.length; ++i )
        {
            if( list[i].className && list[i].className == 'selected' )
            {
                var currFile = list[i].childNodes[0].getAttribute("path");

                if( countOfFile > 0 )
                {
                    fileList += "|";
                }

                fileList += currFile;
                ++countOfFile;
            }
        }
        
        var dirFlag = false;
        if( countOfFile == 0 && this._objRightClicked )
        {
            if( this._objRightClicked.className == "folder" ||
                 this._objRightClicked.className == "dirItem" )
            {
                dirFlag = true;
            }
        
            fileList = this._objRightClicked.getAttribute("path");
            countOfFile = 1;
        }

        // Popup alert to ask if the user is sure they want to delete the files.
        var popupMessage = "Are you sure you want to delete " + countOfFile + " files?";
        if( true == dirFlag )
        {
            popupMessage = "Are you sure you wish to delete this directory, and the files and subdirectories it contains?";
        }
        
        tinyMCE.activeEditor.windowManager.confirm(popupMessage, function(s)
        {
            if (s)
            {
              // If Yes, call webservice with list of files to delete.
                params = "action=deleteFile&folder=" + that._currDirectory +
                       "&files=" + fileList;

                that._sendAjaxRequest( params , function(responseXML) {
                    var failedNodeList = responseXML.getElementsByTagName('failed');

                    if( failedNodeList.length > 0 )
                    {
                        tinyMCE.activeEditor.windowManager.alert('Delete Failed:' + that._getTextNode(failedNodeList[0]) );
                    }
                    else
                    {
                        that.refresh();
                    }
                } );
            }
        });
  },

  fileRename : function() {
      var that = this;
      var list = document.getElementById('dirlist').getElementsByTagName('div');
      var fileList = "";

      // Look for a selected item. use the 1st one.

      for( var i = 0; i < list.length; ++i )
      {
          if( list[i].className && list[i].className == 'selected' )
          {
              fileList = list[i].childNodes[0].getAttribute("path");
              break;
          }
      }

      if( fileList.length == 0 && this._objRightClicked )
      {
          fileList = this._objRightClicked.getAttribute("path");
      }
      
      if( fileList.length == 0 )
      {
          return;
      }

      var originalName = fileList;
      if( -1 < fileList.lastIndexOf("/") )
      {
          originalName = fileList.substring(fileList.lastIndexOf("/")+1);
      }

      // Show popup for new name (popup will call callback to initiate a refresh).
      tinyMCE.activeEditor.windowManager.open({
            file : that.getBaseURL() + '/rename.htm',
            title : 'Rename',
            width : 330,  // Your dimensions may differ - toy around with them!
            height : 80,
            resizable : "no",
            inline : "yes",  // This parameter only has an effect if you use the inlinepopups plugin!
            close_previous : "no"
        }, {
            origname : originalName,
            refreshFn : function(newname) {
               var params = "";

               if ( newname.length > 0)
               {

                   if( newname.indexOf( that._currDirectory ) != 0 )
                   {
                       if( that._currDirectory != "/" )
                       {
                           newname = that._currDirectory + "/" + newname;
                       }
                       else
                       {
                           newname = "/" + newname;
                       }
                   }

                   params = "action=renameFile&from=" + fileList + "&new="+  newname;

                   that._sendAjaxRequest( params , function(responseXML)
                   {
                       var failedNodeList = responseXML.getElementsByTagName('failed');

                       if( failedNodeList.length > 0 )
                       {
                           tinyMCE.activeEditor.windowManager.alert('Rename Failed:' + that._getTextNode(failedNodeList[0]) );
                       }
                       else
                       {
                           that.refresh();
                       }
                   } );
               }

            }
        });
  },

  fileCut : function()
  {
        var list = document.getElementById('dirlist').getElementsByTagName('div');

        var fileCount = 0;
        this._fileList = "CUT";

        for( var i = 0; i < list.length; ++i )
        {
            if( list[i].className && list[i].className == 'selected' )
            {
                var currFile = list[i].childNodes[0].getAttribute("path");

                this._fileList += "|" + currFile;
                fileCount += 1;
            }
        }

        var dirFlag = false;
        
        if( fileCount == 0 && this._objRightClicked )
        {
            if( this._objRightClicked.className == "folder" ||
                 this._objRightClicked.className == "dirItem" )
            {
                dirFlag = true;
            }

            this._fileList = "|" + this._objRightClicked.getAttribute("path");

            fileCount = 1;
        }

        

        // Popup alert to ask if the user is sure they want to cut the files.
        var that = this;

        if( fileCount > 0 )
        {
            params = "action=cutFile&folder=" + this._currDirectory +
                     "&files=" + this._fileList.substring(4) ;

            var popupMessage = "Are you sure you want to cut " + fileCount + " files?"
            if( true == dirFlag )
            {
                popupMessage = "Are you sure you want to cut this directory, and the files and subdirectories it contains?";
            }
 
            // Popup alert to ask if the user is sure they want to delete the files.
            tinyMCE.activeEditor.windowManager.confirm(popupMessage, function(s)
            {

                that._sendAjaxRequest( params , function(responseXML)
                {
                    var failedNodeList = responseXML.getElementsByTagName('failed');

                    if( failedNodeList.length > 0 )
                    {
                        tinyMCE.activeEditor.windowManager.alert('Cut Failed:' + that._getTextNode(failedNodeList[0]) );
                    }
                    else
                    {
                        that.refresh();
                    }
                } );
            } );
        }
  },

  selectFile : function( pathname )
  {
        var pathname = this._httpBaseImageDir + pathname;
        this.insert( pathname );
  },

  uploadFile : function ()
  {
      if( document.ftpappl && 
          document.ftpappl.isActive && 
          document.ftpappl.isActive() && 
          document.ftpappl.setPercentCallBack ) { 
		document.ftpappl.getFiles();
      } else {
        alert("The FTPApplet Java applet must be enabled to do file upload.");
      }
  },

    selectItemForOp : function ( e )
    {
        e = (e) ? e : ((window.event) ? window.event : "");

        var currTarget = null;
        if (e.target)
            currTarget = e.target;
        else
            currTarget = e.srcElement;

        //
        // Since this event is probably bubbling up from an inner element, and not the anchor.
        // So, let's walk backwards and find the anchor... (I would use currentTarget, but
        // that doesn't work on IE)
        //
        var tmp = currTarget;
        while( null != tmp.parentNode )
        {
            if( tmp.nodeType == 1 && tmp.tagName.toLowerCase() == 'a' )
            {
                currTarget = tmp;
                break;
            }

            tmp = tmp.parentNode;
        }


        if( e.shiftKey )
        {
            // Select only items in a range. Go from the index of the item
            // selected 1st time we had a SHIFT+Click to this element.
            // De-select any not in this range.
            var list = document.getElementById('dirlist').getElementsByTagName('div');

            var lastIdx = 0;
            var currIdx = 0;

            for( var i = 0; i < list.length; ++i )
            {
                if( list[i] == this._indexFirstShiftclick )
                {
                    lastIdx = i;
                }

                if( list[i] == currTarget.parentNode )
                {
                    currIdx = i;
                }
            }

            for( var i = 0; i < list.length; ++i )
            {
                list[i].className = '';

                if( i >= Math.min(lastIdx, currIdx) && i <= Math.max(lastIdx, currIdx) )
                    list[i].className = 'selected';
            }
        }
        else if( e.ctrlKey )
        {
            // toggle this one only in the selected list.

            if( currTarget.parentNode.className != 'selected')
            {
                currTarget.parentNode.className = 'selected';
            }
            else
            {
                currTarget.parentNode.className = '';
            }

            this._indexFirstShiftclick = currTarget.parentNode;
        }
        else
        {
            // de-select the others, and select this one.

            var list = document.getElementById('dirlist').getElementsByTagName('div');
            for( var i = 0; i < list.length; ++i )
            {
                list[i].className = '';
            }

            currTarget.parentNode.className = 'selected';
            this._indexFirstShiftclick = currTarget.parentNode;
        }
    },

    _setFilePercent : function( percent )
    {
        document.getElementById('percent').innerHTML = Math.round(percent) + "%";
    },

    _setPercent : function( percent )
    {
        document.getElementById('overallpercent').innerHTML = Math.round(percent) + "%";
    },

    _setStatus : function( statusMsg )
    {
        statusMsg = statusMsg.replace(/\\/g,'/');
        document.getElementById('statusarea').innerHTML = statusMsg;
    },

    _setFilesSelected : function( inFileList )
    {
        var that = this;
        this._fileList = inFileList;

      //
      // If the user actually selected files to send...
      //
      if( inFileList.length > 0 )
      {
          //
          // Make a webservice call to set the upload directory on the server, and if successful, send the files.
          //
            this._setUploadDirectory( this._currDirectory, function() {

                // show the percentage complete bar.
                document.getElementById('progressbar').style.display='inline-block';

                // send the files
                var returnCode = document.ftpappl.sendFiles(that._currSecurityKey,that._fileList);
            }  );
        }
    },

    _finished : function( status, filename )
    {
        if( status != true )
        {
          alert( "Error sending the file '" + filename + "'" );
      }
    },

    _allfinished : function( status )
    {
        //
        // Get the new access key
        //
        currSecurityKey = document.ftpappl.getAccessCode();

        //
        // Clear the percent bar.
        //
        document.getElementById('progressbar').style.display='None';

        //
        // And refresh the list.
        //
        this._getDirContents( this._currDirectory );
    },

    _getDirContents : function( pathname )
    {
        var params = "action=listfiles&path=" + pathname;
        var that = this;

        this._sendAjaxRequest( params , function(list){that._populateCurrDir(list);} );
    },

    _setUploadDirectory : function( pathname , ftpcallbadkFn )
    {
        if( pathname == null )
        {
            pathname = currDirectory;
        }

        var params = "action=PreUploadPhoto&path=" + pathname;

        this._sendAjaxRequest( params , ftpcallbadkFn );
    },


  _populateDirTree : function( dirList )
    {
        //
        // Populate the directory list tree view from the passed in DOM.
        //
        // The treeview starts as a table.
        // For each directory, we'll have a <TR> with a spacer <TD> and a <TD> containing an anchor with an image and text,
        // after the anchor will be a <DIV>. The DIV will contain another table for each directory that contains other directory..

        // start with the parent <DIR> node.
        var treeviewarea = document.getElementById('treeview');
        treeviewarea.innerHTML = "";

        var rootNode = dirList.getElementsByTagName('response')[0];

        var currentDir = treeviewarea.appendChild(document.createElement('table'));
        currentDir.border = '0';
        currentDir.cellspacing="0"
        currentDir.cellpadding="0"

        var currRow = currentDir.insertRow(-1);

        this._populateDirNode( rootNode, currRow );
    },

    _populateDirNode : function( rootNode, domNode )
    {
        var currCell = domNode.insertCell(-1);

        if( null != rootNode )
        {
            if( rootNode.tagName == 'response')
            {
                rootNode.setAttribute('path',"");
                rootNode.setAttribute('name',"");
            }

            var hasChildren = ( rootNode.getElementsByTagName('dir').length > 0 );

            var tmpHtml = "";

            if( hasChildren )
            {
                tmpHtml += "<a class='folder' expanded='0' path='" + rootNode.getAttribute('path')+ "/" + rootNode.getAttribute('name') + "' onClick='FileMgrDialog.toggle(this)'>";
                tmpHtml += "<img src='img/plus.gif'></a>";
                tmpHtml += "<a path='" + rootNode.getAttribute('path')+ "/" + rootNode.getAttribute('name') + "'";
            }
            else
            {
                tmpHtml += "<img src='img/blank.gif'>";
                tmpHtml += "<a path='" + rootNode.getAttribute('path') + "/" + rootNode.getAttribute('name') + "'";
            }

            if( hasChildren )
            {
                tmpHtml += "class='folder'";
            }
            else
            {
                tmpHtml += "class='leaf'";
            }

            tmpHtml += " onClick='FileMgrDialog.selectLeaf( this )'>";

            if( rootNode.getAttribute('name').length  == 0 )
            {
                rootNode.setAttribute('name',"/");
            }

            tmpHtml += "<img src='img/folder_closed.png'> &nbsp; "+rootNode.getAttribute('name')+"</a>";

            currCell.innerHTML = tmpHtml;

            if( hasChildren )
            {
                var div = currCell.appendChild( document.createElement('div') );

                div.style.display='none';

                var children = rootNode.childNodes;
                for(var indx = 0; indx < children.length; ++indx )
                 {
                    if( children[indx].tagName == 'dir' )
                    {
                        var currentDir = div.appendChild( document.createElement('table') );
                        currentDir.border = '0';
                        currentDir.cellspacing="0"



                        currentDir.cellpadding="0"
                        var currRow = currentDir.insertRow(-1);
                        var currCell = currRow.insertCell(-1);
                        currCell.width='5px';

                        this._populateDirNode( children[indx], currRow );
                    }
                }
            }
        }
    },

    _populateCurrDir : function( dircontents )
    {
        var that = this;
        //
        // Display the directory contents using the XML passed in,
        // If there are any <dir> nodes passed back, ensure they are listed in the tree list. If
        // not, add them.
        //
        // Dirs will be shown using a special icon, and will not contain attributes "size" "width" "height" or "colors".
        // Files will contain these, and the icon will be a scaled-down version of the image name.
        //
        var treeviewarea = document.getElementById('dirlist');
        var rootNode = dircontents.getElementsByTagName('response')[0];

        var httpBaseImageDir = this._getTextNode( dircontents.getElementsByTagName('basedir')[0] );

        this._httpBaseImageDir = httpBaseImageDir;

        var tmpHtml = "";

        var children = rootNode.childNodes;
        for(var indx = 0; indx < children.length; ++indx )
        {
            if( children[indx].tagName == 'dir' )
            {
                if( children[indx].getAttribute('path') == '/' )
                {
                    children[indx].setAttribute('path','') ;
                }

                imagefilename = 'img/opened-folder-48x48.png';
                if( children[indx].getAttribute('name') == ".." )
                {
                    imagefilename = 'img/folderback.png';
                }

                tmpHtml += "<div style='height:51px; vertical-align:middle; margin-top:5px; margin-left:5px;'> " +
                           "<a class = 'dirItem' style='height:51px;width:381px;vertical-align:middle;' path='" + children[indx].getAttribute('path') + "/" + children[indx].getAttribute('name') + "' onDblClick='FileMgrDialog.selectDir(\"" + children[indx].getAttribute('path') + "/" + children[indx].getAttribute('name') + "\")'>" +
                           "<img src='" + imagefilename + "' style='height:51px;vertical-align:middle;'> <span style='align:left;'> &nbsp; " + children[indx].getAttribute('name') + "</span></a></div>\n";
            }
        }

        for(var indx = 0; indx < children.length; ++indx )
        {
            if( children[indx].tagName == 'file' )
            {
                if( children[indx].getAttribute('path') == '/' )
                {
                    children[indx].setAttribute('path','') ;
                }

                tmpHtml += "<div style='height:51px; vertical-align:top; margin-top:5px; margin-left:5px;'>" +
                           "<a class='fileItem' onDblClick='FileMgrDialog.selectFile(this.getAttribute(\"path\"))' style='height:51px;width:381px;' path='" + children[indx].getAttribute('path') + "/" + children[indx].getAttribute('name') + "'>" +
                           "<img src='" + httpBaseImageDir + children[indx].getAttribute('path') + "/" + children[indx].getAttribute('name') + "' height='50px' width='50px' style='float:left'> " +
                           "<span style='vertical-align:top; align:left;height:51px;'> &nbsp;" + children[indx].getAttribute('name') +
                           "<br> &nbsp; " + children[indx].getAttribute('width') + "x" + children[indx].getAttribute('height') +
                           "<br> &nbsp; " + children[indx].getAttribute('size') + " bytes " +
                           "</span><br style='clear:both; height:1px;'></a></div>\n";
            }
        }

        treeviewarea.innerHTML = tmpHtml;

        var elements = treeviewarea.getElementsByTagName('a');
        for( var i in elements )
        {
            if( elements[i] && elements[i].className && elements[i].className == 'fileItem' )
            {
                if (document.attachEvent)
                {
                    elements[i].attachEvent("onclick",function(e) { return FileMgrDialog.selectItemForOp(e); } );
                }
                else
                {
                    elements[i].addEventListener("click",function(e) { return FileMgrDialog.selectItemForOp(e); }, false);
                }
            }
        }
        
        var currPath = "";
        for(var indx = 0; indx < children.length; ++indx )
        {
            if( children[indx].tagName == 'dir' )
            {
                currPath = children[indx].getAttribute('path');
                if( currPath == "" )
                {
                    currPath = "/";
                }
                
                break;
            }
        }
            
        var treeviewNodes = document.getElementById('treeview').getElementsByTagName("a");
        for( var idx = 0; idx < treeviewNodes.length; ++ idx )
        {
            if( treeviewNodes[idx].getAttribute('path') == currPath )
            {
                this._addClass( treeviewNodes[idx], "selected" );     
            }      
            else
            {
                this._removeClass( treeviewNodes[idx], "selected" );     
            }
        }          
        
    },

    selectLeaf : function( node )
    {
        // Show the contents of the directory.
        if( node != null )
        {
            var pathname = node.getAttribute('path');

            this._currDirectory = pathname;

            this._getDirContents( pathname );
        }
    },

    selectDir : function (currPath)
    {
        // A directory has been selected. Find it's node in the treeview, and if it has children, toggle it.

        var pathname = currPath;

        var treeviewNodes = document.getElementById('treeview').getElementsByTagName("a");

        var listOfDirsToExpand = currPath.split("/");

        //
        // In doing the expand, we also want to expand the parent nodes, so we'll start at root
        // and expand down to the current path node.
        //
        for( var treeIdx = 0; treeIdx < listOfDirsToExpand.length; ++treeIdx )
        {
            var currNode = listOfDirsToExpand.slice(0,treeIdx+1).join("/");

            if( currNode.length == 0)
            {
                currNode = "/";
            }

            for( var idx = 0; idx < treeviewNodes.length; ++ idx )
            {
                if( treeviewNodes[idx].getAttribute('path') == currNode && this._containsClass(treeviewNodes[idx],'folder') )
                {
                   this.expand(treeviewNodes[idx]);

                   // TODO: scroll down to the directory.

                   break;
                }
            }
        }

        this._currDirectory = pathname;

        this._getDirContents( pathname );
    },

    expand : function( node )
    {
        if( node.getAttribute('expanded') == '0' )
        {
            this.toggle( node );
        }
    },

    collapse : function ( node )
    {
        if( node.getAttribute('expanded') == '1' )
        {
            this.toggle( node );
        }
    },

    toggle : function(node)
    {
        // Get the next tag (read the HTML source)
      var nextDIV = node.nextSibling;

      // find the next DIV
      while(nextDIV.nodeName != "DIV")
      {
        nextDIV = nextDIV.nextSibling;
      }

      // Unfold the branch if it isn't visible
      if (nextDIV.style.display == 'none')
      {
        // Change the image (if there is an image)
        if (node.childNodes.length > 0)
        {
          if (node.childNodes.item(0).nodeName == "IMG")
          {
              node.childNodes.item(0).src = this._getImgDirectory(node.childNodes.item(0).src) + "minus.gif";
          }
        }

        nextDIV.style.display = 'block';
        node.setAttribute('expanded','1');
      }

      // Collapse the branch if it IS visible
      else
      {
        // Change the image (if there is an image)
        if (node.childNodes.length > 0)
        {
          if (node.childNodes.item(0).nodeName == "IMG")
          {
              node.childNodes.item(0).src = this._getImgDirectory(node.childNodes.item(0).src) + "plus.gif";
          }
        }

        nextDIV.style.display = 'none';
        node.setAttribute('expanded','0');
      }
    },
   _addClass : function( node, className )
    {
        if( node )
        {
            if( !this._containsClass(node, className ) )
            {
                var currclassName = node.className;
                node.className = currclassName + " " + className;
            }   
        }
    },
    
    _setClass : function( node, className )
    {
        if( node )
        {
            node.className = className;
        }
    },
    
    _containsClass : function( node, className )
    {
        var returnCode = false;
        
        if( node )
        {
            var currclasses = node.className.split(" ");    
            for(var idx = 0; idx < currclasses.length; ++idx)
            {
                if( currclasses[idx] == className )
                {
                    returnCode = true;
                    break;
                }
            }
        }        
        
        return returnCode;
    },
    
    _removeClass : function( node, className )
    {
        if( node )
        {
            var currclassName = node.className;
            var newClassName = "";
                
            var currclasses = currclassName.split(" ");
            for(var idx = 0; idx < currclasses.length; ++idx)
            {
                if( currclasses[idx] != className )
                {
                    newClassName = newClassName + " " + currclasses[idx];
                }
            }
                
            node.className = newClassName.replace(/^\s*/, "").replace(/\s*$/, "");
        }
    },
    
    _getImgDirectory : function(source)
    {
        return source.substring(0, source.lastIndexOf('/') + 1);
    },

    _createXMLHttpRequest : function()
    {
        if (typeof XMLHttpRequest != "undefined")
        {
            return new XMLHttpRequest();
        }
        else if (typeof ActiveXObject != "undefined")
        {
            return new ActiveXObject("Microsoft.XMLHTTP");
        }
        else
        {
            throw new Error("XMLHttpRequest not supported");
        }
    },

    _sendAjaxRequest : function( params , callbackFn )
    {
       var xhtObj = this._createXMLHttpRequest();
       var that = this;

       document.body.style.cursor='wait';
       
       params = params + "&key=" + this._currSecurityKey

       xhtObj.open("POST", "ftpauthserver.php", true);
       xhtObj.onreadystatechange = function()
       {
           if (xhtObj.readyState == 4)
           {
               if( xhtObj.responseXML != null )
               {
                   var baseresp = xhtObj.responseXML.getElementsByTagName('response')[0];
                   if( baseresp.getElementsByTagName('newauth').length > 0 )
                   {
                       that._currSecurityKey = that._getTextNode(baseresp.getElementsByTagName('newauth')[0]);
                   }

                   callbackFn (xhtObj.responseXML);
               }

               document.body.style.cursor='default';
           }
       }

       xhtObj.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
       xhtObj.setRequestHeader("Content-length", params.length);
       xhtObj.setRequestHeader("Connection", "close");
       xhtObj.send(params);
    },

    _getTextNode : function( element )
    {
        var returnedText = "";

        if( element )
        {
            if( element.textContent )
            {
                returnedText = element.textContent;
            }
            else if( element.text )
            {
                returnedText = element.text;
            }
        }

        if( returnedText.indexOf("[CDATA[") > -1 )
        {
            returnedText = returnedText.substring(7);
        }

        if( returnedText.lastIndexOf("]]") > -1 )
        {
            returnedText = returnedText.substring(0, returnedText.lastIndexOf("]]") );
        }

        return returnedText;
    },

    _setEventListener : function( obj, event, callback )
    {
        var functionCallObj = function(e){e = (e)?e:((window.event)?window.event:null);return callback(e);};
        if( obj.attachEvent )
        {
            obj.attachEvent(event, functionCallObj );
        }
        else
        {
            event = event.substring(2,event.length).toLowerCase();
            obj.addEventListener(event, functionCallObj, false);
        }
    },

     _rightclick : function(e)
    {
        // Handle the right-click menu...
        var rightClick = false;

        if (e.which)
            rightClick = (e.which == 3);
        else if (e.button)
            rightClick = (e.button == 2);

        if( rightClick )
        {
            // Get the position of the click...
            var posx = 0;
            var posy = 0;
            if (e.pageX || e.pageY)   
            {
                posx = e.pageX;
                posy = e.pageY;
            }
            else if (e.clientX || e.clientY)  
            {
                posx = e.clientX + document.body.scrollLeft
                       + document.documentElement.scrollLeft;
                posy = e.clientY + document.body.scrollTop
                       + document.documentElement.scrollTop;
            }
            
            //
            // Get the target item in the browse list (either directory or file list)
            // Since this event is probably bubbling up from an inner element, and not the anchor.
            // So, let's walk backwards and find the anchor... (I would use currentTarget, but
            // that doesn't work on IE)
            //
            var currTarget = null;
            if (e.target)
                currTarget = e.target;
            else
                currTarget = e.srcElement;

            var tmp = currTarget;
            while( null != tmp.parentNode )
            {
                if( tmp.nodeType == 1 && tmp.tagName.toLowerCase() == 'a' )
                {
                    currTarget = tmp;
                    break;
                }
                
                if( tmp.nodeType == 1 && tmp.id.toLowerCase() == 'filemgr' )
                {
                    currTarget = null;
                    break;
                }

                tmp = tmp.parentNode;
            }
            
            this._objRightClicked = currTarget;
            
            // if the target is the "back" directory entry, then exit without showing the menu.
            if( null != currTarget &&
                currTarget.getAttribute("path").indexOf("..") > -1 )
            {
                (e.stopPropagation) ? e.stopPropagation() : e.cancelBubble = true;
                (e.preventDefault) ? e.preventDefault() : e.returnValue = false;
                return false;
            }
            
            //
            // Now, create the popup div, if not already present.
            //
            var popupdiv = document.getElementById('filemgrrightclickmenu');
            
            if(!popupdiv)
            {
                popupdiv = document.createElement('div');
                popupdiv.className = 'filemgrpopupmenu';
                popupdiv.id = 'filemgrrightclickmenu';
                popupdiv.style.position = 'absolute';

                popupdiv.innerHTML = "<a href='#' id='filemgrpopupcut' onClick='FileMgrDialog._rightClickAction(this); return false;'> Cut </a>" +
                                     "<a href='#' id='filemgrpopupcopy' onClick='FileMgrDialog._rightClickAction(this); return false;'> Copy </a>" +
                                     "<a href='#' id='filemgrpopuppaste' onClick='FileMgrDialog._rightClickAction(this); return false;'> Paste </a>" +
                                     "<a href='#' id='filemgrpopupdelete' onClick='FileMgrDialog._rightClickAction(this); return false;'> Delete </a>" +
                                     "<a href='#' id='filemgrpopuprename' onClick='FileMgrDialog._rightClickAction(this); return false;'> Rename </a>";

                document.getElementsByTagName('body')[0].appendChild(popupdiv);

                this._setEventListener( popupdiv,
                                         "onmouseout", 
                                         function(e) { 
                                             FileMgrDialog._rightClickMenuHide(e);
                                             return false; 
                                         } );
            }

            // Get the bounding box for the popup div. This will be the document size.
            
            var boundingwidth = popupdiv.parentNode.offsetWidth;
            var boundingheight = popupdiv.parentNode.offsetHeight;
            
            var popupwidth = 0;
            var popupheight = 0;
                        
            if( window.getComputedStyle )
            {            
                popupwidth = parseInt(getComputedStyle(popupdiv, null).getPropertyValue("width"));
                popupheight = parseInt(getComputedStyle(popupdiv, null).getPropertyValue("height"));
            }
            else
            {
                popupwidth = parseInt(popupdiv.currentStyle.width);
                popupheight = parseInt(popupdiv.currentStyle.height);
            }
           
            if( posx + popupwidth > boundingwidth )
            {
                posx = boundingwidth - popupwidth;
            }

            if( posy + popupheight > boundingheight )
            {
                posy = boundingheight - popupheight;
            }

            // Position the popup at the proper place
            popupdiv.style.left = posx + "px";
            popupdiv.style.top = posy + "px";
            popupdiv.style.display = 'block';

            (e.stopPropagation) ? e.stopPropagation() : e.cancelBubble = true;
            (e.preventDefault) ? e.preventDefault() : e.returnValue = false;
            return false;
        }
    },

    _rightClickAction : function( e )
    {
        // See if we have one or more items highlighted.
        var list = document.getElementById('dirlist').getElementsByTagName('div');

        var fileCount = 0;

        for( var i = 0; i < list.length; ++i )
        {
            if( list[i].className && list[i].className == 'selected' )
            {
                fileCount = 1;  
                break;
            }
        }        
        
        // So, now if we have a selected item or items, lets perform the appropriate action...
        if( fileCount > 0 || this._objRightClicked != null || e.id == 'filemgrpopuppaste' )
        {
            if( e.id == 'filemgrpopupcut' )
            {
                this.fileCut();
            }
            else if( e.id == 'filemgrpopupcopy' )
            {
                this.fileCopy();
            }
            else if( e.id == 'filemgrpopuppaste' )
            {
                this.filePaste();
            }
            else if( e.id == 'filemgrpopupdelete' )
            {
                this.fileDelete();
            }
            else if( e.id == 'filemgrpopuprename' )
            {
                this.fileRename();
            }            
        }
        
        this._rightClickMenuHide(e);
        
        return false;
    },

    _rightClickMenuHide : function( e )
    {
        var popupdiv = document.getElementById('filemgrrightclickmenu');
        var popuptop = 0;
        var popupleft = 0;
        var popupwidth = 0;
        var popupheight = 0;
        
        // If the mouse is outside of the popup menu, then hide it.
        if( window.getComputedStyle )
        {            
            popuptop = parseInt(getComputedStyle(popupdiv, null).getPropertyValue("top"));
            popupleft = parseInt(getComputedStyle(popupdiv, null).getPropertyValue("left"));
            popupwidth = parseInt(getComputedStyle(popupdiv, null).getPropertyValue("width"));
            popupheight = parseInt(getComputedStyle(popupdiv, null).getPropertyValue("height"));
        }
        else
        {
            popuptop = parseInt(popupdiv.currentStyle.top);
            popupleft = parseInt(popupdiv.currentStyle.left);
            popupwidth = parseInt(popupdiv.currentStyle.width);
            popupheight = parseInt(popupdiv.currentStyle.height);
        }
        
            // Get the position of the click...
            var posx = 0;
            var posy = 0;
            if (e.pageX || e.pageY)   
            {
                posx = e.pageX;
                posy = e.pageY;
            }
            else if (e.clientX || e.clientY)  
            {
                posx = e.clientX + document.body.scrollLeft
                       + document.documentElement.scrollLeft;
                posy = e.clientY + document.body.scrollTop
                       + document.documentElement.scrollTop;
            }

            if( posx < popupleft || posx > popupleft + popupwidth ||
                posy < popuptop || posy > popuptop + popupheight )
            {
                popupdiv.style.display = 'none';
            }	
    }
};

tinyMCEPopup.onInit.add(FileMgrDialog.init, FileMgrDialog);
