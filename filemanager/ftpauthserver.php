<?php

    $ftpRoot = "<FTP USER ROOT DIRECTORY>";                 // Root directory for the FTP user.
    $tempUploadFolder = "/secure_images/temp";              // Realative directory to place files (relative to FTP base above).
    $tempCutPasteFolder = "\tmp\imagecutbuffer";            // Where files wait after cut, before paste.
    $ImageFolder = "<FULL PATH OF FILES AREA>";             // Full pathname for the base (root) directory of the images folder.
    $ImageFolderHttpAddr = "<WEB PATH OF FILE AREA";        // Relative or absolute URL of the images folder for web.
        
    require_once('pclzip.lib.php');                         // used to process ZIP files.
    require_once('<PATH TO INCLUDES FOLDER>/filemgr.php');  // Contains definitions for FTP user name and password... outside doc path.

    session_start();

    //
    // Try to prevent session fixation attack.
    //
    if (!isset($_SESSION['sesshacktestvariablename']))
    {
        session_regenerate_id();
        $_SESSION['sesshacktestvariablename'] = true;
    }        

    header("Content-type: text/xml");
    print("<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>\n");  
    print("<response>\n");


    //
    // This can be used to do a security check. the parameter 'key' is regenerated and resent on each transaction
    // and can be checked against the session, along with other paramters to make sure that the user is authorized
    // and the connection has not been compromised. This won't prevent "man in the middle" attacks, but nothing
    // short of a certificate driven encryption (like SSL) will...
    //
    $origKey = $_POST['key'];
    $validated = false;
    $validated_see = true;
    
    if( true == $validated && isSet($_POST['action']) &&  $_POST['action'] == 'PreUploadPhoto' )
    {
        //
        //  This method allows you to pre-validate that the images about to be uploaded are allowable
        // and will fit within whatever parameters you choose, including user size / count limits, etc.
        // All you have to do to allow the upload is print a <success> node, as below. To disallow, pass
        // back a <failed> node with a text explanation as the text value.
        //
        if( isSet( $_POST['path'] ) && strlen( $_POST['path'] ) > 0 )
        {
            $_SESSION['uploadReady'] = true;
            $_SESSION['uploaDirectory'] = $_POST['path'];
            print("<success/>\n");
        }
    }
    elseif( true == $validated && isSet($_POST['action']) &&  $_POST['action'] == 'uploadPhoto' && $_SESSION['uploadReady'] == true )
    {
        //
        //    We are going to be asking permission to Ftp a picture to the server. 
        // This is used by the Java applet, directly. This can also be used to limit 
        // and validate files. In this case, however, we also get a list of the individual files from the
        // applet, so it's less easy to fake.
        //      
        // $_POST['filelist'];  Perhaps we will want to limit it to valid files.
        //
        
        //
        // If so, generate a new secure key, and pass back all of the necessary information.    
        //
                  
        $newKey = generateKey( 10 );
        $_SESSION['photoAdminsecureKey'] = $newKey; 

        print("<success>\n");
        print("<dir>".$tempUploadFolder."</dir>\n");
        print("<usr>".MCE_FTP_USER."</usr>\n");
        print("<pass>".MCE_FTP_PASSWD."</pass>\n");
        print("<newauth>" . $newKey . "</newauth>\n");
        print("</success>\n");          
    }
    elseif(  true == $validated && isSet($_POST['action']) &&  $_POST['action'] == 'photoUploadDone' )
    {
        //
        // Process the uploads from the FTPApplet or SFTPApplet. 
        //
        print("<success>\n");

        $newKey = generateKey( 10 );
        $_SESSION['photoAdminsecureKey'] = $newKey; 
            
        // the list of files actually sent is in $_POST['filelist'];
        $filesListString = urldecode($_POST['filelist']);
        $listOfFiles = explode(";",$filesListString);
            
        $sourceDirectory = $ftpRoot.$tempUploadFolder;
        $destinationDirectory = $ImageFolder . $_SESSION['uploaDirectory'];
            
        for( $indx = 0; $indx < sizeof($listOfFiles); ++$indx)
        {
            rename($sourceDirectory."/".$listOfFiles[$indx],$destinationDirectory."/".$listOfFiles[$indx]);
            print("<status>[!CDATA[ Moved file from ".$sourceDirectory."/".$listOfFiles[$indx]." to ". $destinationDirectory."/".$listOfFiles[$indx] . "]]</status>\n");

            $oldumask = umask(0) ;
          	@chmod( $destinationDirectory."/".$listOfFiles[$indx], 0744 ) ;
	          umask( $oldumask ) ;
            
    
            // If the file is a zip file, we need to unzip it in the current directory, and remove the zip file.
            if( pathinfo($listOfFiles[$indx],PATHINFO_EXTENSION) == 'zip' )
            {
            	//
        	    // Now, open the zip file, and extract the images. For each image, if successful, print a Javascript call to add the pic to the parent window.
 	            //
		       $archive = new PclZip($destinationDirectory."/".$listOfFiles[$indx]);
	   
	           $statusList = $archive->extract( PCLZIP_OPT_PATH, 
	                                            $destinationDirectory,
                                                PCLZIP_OPT_REMOVE_ALL_PATH);
            }
            
            
        }

        print("<newauth>" . $newKey . "</newauth>\n");
        print("</success>\n");
            
        //
        // This could include either scaling the files, moving them into another folder, or 
        // registering them with the main application.
        //
            
    }   
    elseif( true == $validated_see && isSet($_POST['action']) &&  $_POST['action'] == 'listDirs' )
    {
        //
        // Request to have the server process a list of all the files in the filesystem
        //
        $newKey = generateKey( 10 );
        $_SESSION['photoAdminsecureKey'] = $newKey; 
            
        print("<success/>\n");
        print("<newauth>" . $newKey . "</newauth>\n");
        //
        // Start at the configured relative pathname, and recursively get the list of 
        // folders and files in each subdirectory. For each file, validate that it is the 
        // proper type, and send it's size, dimensions, and number of colors.
        //
        
        printDirectories( );
            
    }   
    elseif( true == $validated_see && isSet($_POST['action']) &&  $_POST['action'] == 'listfiles' )
    {
        //
        // Request to have the server process a list of all the files in the filesystem
        //
        $newKey = generateKey( 10 );
        $_SESSION['photoAdminsecureKey'] = $newKey; 
            
        print("<success/>\n");
        print("<newauth>" . $newKey . "</newauth>\n");
        print("<currDir>" . $_POST['path'] . "</currDir>\n");           
        print("<basedir>" . $ImageFolderHttpAddr . "</basedir>\n");         
            
        //
        // Start at the configured relative pathname, and recursively get the list of 
        // folders and files in each subdirectory. For each file, validate that it is the 
        // proper type, and send it's size, dimensions, and number of colors.
        //
        
        printDirectoryFiles( $_POST['path'] );
            
    }       
    elseif( true == $validated && isSet($_POST['action']) &&  $_POST['action'] == 'addFolder' )
    {
        //
        // Request to have the server add a folder of the specified pathname (relative to the 
        // filesystem base.
        //
        $returnCode = false;
        $newKey = generateKey( 10 );
        $_SESSION['photoAdminsecureKey'] = $newKey; 
                
        //
        // If $_POST['path'] is set, and is not already a file or directory,
        //
        if( isSet( $_POST['path'] ) && strlen( $_POST['path'] ) > 0 &&
            !file_exists($ImageFolder . $_POST['path']) )
        {
            // 
            // Create the directory.
            // 
            $returnCode = mkdir( $ImageFolder . $_POST['path'], 0777 );
        }
            
        if( $returnCode == true )
        {
            print("<success/>\n");
            print("<newauth>" . $newKey . "</newauth>\n");  
        }
        else
        {
            print("<failed>".$php_errormsg."</failed>\n");          
            print("<newauth>" . $newKey . "</newauth>\n");  
        }           
    }       
    elseif( true == $validated && isSet($_POST['action']) &&  $_POST['action'] == 'renameFile' )
    {
        //
        // Request to have the server rename or move a folder or file of the specified pathname (relative to the 
        // filesystem base.
        //
        $returnCode = false;
        $newKey = generateKey( 10 );
        $_SESSION['photoAdminsecureKey'] = $newKey; 

        //
        // If $_POST['from'] is set, and is a file or directory,
        //    and if $_POST['new'] is set, and is NOT already a file or directory,
        //
        if( isSet( $_POST['from'] ) && strlen( $_POST['from'] ) > 0 &&
            file_exists($ImageFolder . $_POST['from'] ) &&
            isSet( $_POST['new'] ) && strlen( $_POST['new'] ) > 0 &&
            !file_exists($ImageFolder . $_POST['new']) )
        {
            // 
            // make the move.
            // 
            $returnCode = rename($ImageFolder . $_POST['from'], $ImageFolder . $_POST['new']);
        }
            
        if( $returnCode == true )
        {
            print("<success/>\n");
            print("<newauth>" . $newKey . "</newauth>\n");  
        }
        else
        {
            print("<failed>".$php_errormsg."</failed>\n");          
            print("<newauth>" . $newKey . "</newauth>\n");  
        }
    }   
    elseif( true == $validated && isSet($_POST['action']) &&  $_POST['action'] == 'deleteFile' )
    {
        $newKey = generateKey( 10 );
        $_SESSION['photoAdminsecureKey'] = $newKey; 
            
        // Pipe separated list of files. 
        $fileList = $_POST['files'];
        
        // Delete the files. Return a <success> if all passed. If any failed, return
        // a <failed> node with the error message...
        $filesArray = split("\|",$fileList);
        $errorList = "";
        $returnCode = true;
        
        foreach($filesArray as $file)
        {
            $pathToDelete = $ImageFolder . $file;
            
            if(! unlink($pathToDelete) )
            {
                $errorList += $pathToDelete . ", ";
                $returnCode = false;
            }        
        }
        
        if( true == $returnCode )
        {
            print("<success/>\n");
            print("<newauth>" . $newKey . "</newauth>\n");              
        }
        else
        {
            print("<failed> Error deleting files: ".$errorList."</failed>\n");          
            print("<newauth>" . $newKey . "</newauth>\n");          
        }
    }
    elseif( true == $validated && isSet($_POST['action']) &&  $_POST['action'] == 'copy' )
    {
        $newKey = generateKey( 10 );
        $_SESSION['photoAdminsecureKey'] = $newKey;             
    
        $fileList = $_POST['files'];
        $toFolder = $_POST['folder'];
    
        // Copy files listed to the "toFolder" directory. Return a <success>        
        // if all passed. If any failed, return a <failed> node with the error message...
        $newKey = generateKey( 10 );
        $_SESSION['photoAdminsecureKey'] = $newKey; 
            
        // Delete the files. Return a <success> if all passed. If any failed, return
        // a <failed> node with the error message...
        $filesArray = split("\|",$fileList);
        $errorList = "";
        $returnCode = true;
        
        foreach($filesArray as $file)
        {
            if( substR($file,0,1) != "/" )
            {
                $file = "/" . $file;
            }
        
            $pathFrom = $ImageFolder . $file;
            
            $pathTo = $ImageFolder . $toFolder . "/" . basename($file);

            print("<comment> Copy from : " . $pathFrom . "     to: " . $pathTo . " </comment>\n" );
            
            if(!copy($pathFrom, $pathTo) )
            {
                $errorList += basename($file) . ", ";
                $returnCode = false;
            }        
        }
        
        if( true == $returnCode )
        {
            print("<success/>\n");
            print("<newauth>" . $newKey . "</newauth>\n");              
        }
        else
        {
            print("<failed> Error copying files: ".$errorList."</failed>\n");           
            print("<newauth>" . $newKey . "</newauth>\n");          
        }        
    }
    elseif( true == $validated && isSet($_POST['action']) &&  $_POST['action'] == 'cutFile' )
    {
        $newKey = generateKey( 10 );
        $_SESSION['photoAdminsecureKey'] = $newKey; 
        $returnCode = true;
        $errorMessage = "";
        
        // Pipe separated list of files. 
        $fileList = $_POST['files'];
    
        // Make sure the temp folder for cut/paste exists, and can be written to.
        
        // If it's not there, try creating it.
        if( !file_exists( $tempCutPasteFolder ) )
        {
            $returnCode = mkdir($tempCutPasteFolder);
        }
        
        // Make sure the temp directory is there, and is writable...
        if( !file_exists( $tempCutPasteFolder ) || 
            !is_dir( $tempCutPasteFolder ) ||
            !is_writable( $tempCutPasteFolder ) )
        {
            $returnCode = false;
            $errorMessage = "Temporary directory does not exist, or is not writable.";
        }
        
        // Move files to the temp directory. Remember them for a paste. 
        if( true == $returnCode )
        {
            $fileArray = split("\|",$fileList);    
            
            $_SESSION['CutPasteFileList'] = $fileArray;
            
            foreach($fileArray as $currFile)
            {
                $fromFile = $ImageFolder . $currFile;
                $toFile = $tempCutPasteFolder . "/" . basename($currFile);
                
                if( !rename( $fromFile, $toFile ) )
                {
                    $errorMessage = "Unable to move one or more files to the temporary directory.";
                    $returnCode = false;
                }
            }
        }
        
        // Return a <success> if all passed. If any failed, return a <failed> node with the error message...
        if( true == $returnCode )
        {
            print("<success\>\n");
            print("<newauth>" . $newKey . "</newauth>\n");              
        }
        else
        {
            print("<failed>". $errorMessage ."</failed>\n");
            print("<newauth>" . $newKey . "</newauth>\n");                      
        }
    }
    elseif( true == $validated && isSet($_POST['action']) &&  $_POST['action'] == 'paste' )
    {
        $newKey = generateKey( 10 );
        $_SESSION['photoAdminsecureKey'] = $newKey; 
        $returnCode = true;         
        
        $fileList = $_POST['files'];
        $toFolder = $_POST['folder'];
    
        // Make sure the temp directory is there, and is writable...
        if( !file_exists( $tempCutPasteFolder ) || 
            !is_dir( $tempCutPasteFolder ) ||
            !is_writable( $tempCutPasteFolder ) )
        {
            $returnCode = false;
            $errorMessage = "Temporary directory does not exist, or is not writable.";
        }

        if( true == $returnCode )
        {
            $fileArray = split("\|",$fileList);                
            $rememberedFileArray = $_SESSION['CutPasteFileList'];
        
            foreach($fileArray as $currFile)
            {
                // Take the remembered file list. Match them against the filenames in the fileList. 
                foreach($rememberedFileArray as $currFileToCheck)
                {
                    // For each matching filename, copy the files from the *special* temp folder to the "toFolder".        
                    if( $currFileToCheck == $currFile )
                    {                   
                        $fromFile = $tempCutPasteFolder . "/" . basename($currFile);
                        $toFile =  $ImageFolder . "/" . $toFolder . "/" . basename($currFile);
                
                        if( !rename( $fromFile, $toFile ) )
                        {
                            $errorMessage = "Unable to move one or more files to the temporary directory.";
                            $returnCode = false;
                        }                    
                    }
                }
            }
        }
            
        // Return a <success> if all passed. If any failed, return a <failed> node with the error message...
        if( true == $returnCode )
        {
            print("<success\>\n");
            print("<newauth>" . $newKey . "</newauth>\n");              
        }
        else
        {
            print("<failed>". $errorMessage ."</failed>\n");
            print("<newauth>" . $newKey . "</newauth>\n");                      
        }        
    }
    else
    {
        //
        // Else, pass back an error message.
        //
        if(true == $validated )
        {
               print("<failed> Invalid command:".$_POST['action']." </failed>\n");
        }
        else
        {
            print("<failed> Not authorized to perform this action. </failed>\n");
        }
    }
            
    print("</response>\n");                 
 
 
 
function generateKey( $length )
{
    // start with a blank password
    $password = "";

    // define possible characters
    $possible = "0123456789bcdfghjkmnpqrstvwxyz"; 
    
    // set up a counter
    $i = 0; 
    
    // add random characters to $password until $length is reached
    while ($i < $length) 
    {  
        // pick a random character from the possible ones
        $char = substr($possible, mt_rand(0, strlen($possible)-1), 1);
        
        // we don't want this character if it's already in the password
        if (!strstr($password, $char)) 
        { 
            $password .= $char;
            $i++;
        }
    }

    // done!
    return $password;
}


function printDirectories( $path = '', $level = 0 )
{
    global $ImageFolder;
    
    $ignore = array( '.', '..' );
        
    $dh = @opendir( $ImageFolder.$path );

    while( false !== ( $file = readdir( $dh ) ) )
    {        
        if( !in_array( $file, $ignore ) )
        {
            $spaces = str_repeat( ' ', ( $level * 4 ) );
            if( is_dir( "$ImageFolder/$path/$file" ) )
            {
                print "$spaces <dir name='$file' path='$path'>\n";
                printDirectories( "$path/$file", ($level+1) );            
                print "$spaces </dir>\n";
            } 
        }
    }
    
    closedir( $dh );
} 

function printDirectoryFiles( $path = '/')
{
    global $ImageFolder;
    
    
    // If path has any .. we need to do the back-up.
    // Note: Don't let the user back up before ROOT...
    if( strpos($path, "..") > 0 )
    {         
        $explodedList = explode("/", $path);         
        $path = "";
        for( $indx = 1; $indx < sizeof($explodedList); ++$indx ) 
        {
            // Peek ahead at the next entry. If it's not a ".." then add the current node.
            if( ($indx + 1 < sizeof($explodedList) && $explodedList[$indx + 1] != '..' ) ||
                ($indx + 1 == sizeof($explodedList) && $explodedList[$indx] != '..' ) )
            {   
                $path .= "/" . $explodedList[$indx];
            }
        }
    }
    
    // Now, if we're not in the root directory (i.e. path isn't '/' or '.') we show ".."
    if( $path != '/' && $path != '')
    {
         print "$spaces <dir name='..' path='$path'/>\n";
    }
    
    // Now, get the list of files and directories inside this directory.      
    $ignore = array( '.', '..' );
        
    $dh = @opendir( $ImageFolder.$path );
    
    while( false !== ( $file = readdir( $dh ) ) )
    {        
        if( !in_array( $file, $ignore ) )
        {
            $spaces = str_repeat( ' ', ( $level * 4 ) );
            if( is_dir( "${ImageFolder}$path/$file" ) )
            {                
                print "$spaces <dir name='$file' path='$path'/>\n";
            } 
            else 
            {
                // Try to open the file as either a PNG, JPG, or GIF.
                $pinfo = pathinfo($path."/".$file);
                $extension = $pinfo['extension'];
                
                $image = false;
                if( strtoupper($extension) == "GIF" )
                {
                    $image = imagecreatefromgif("${ImageFolder}$path/$file");
                }
                elseif(  strtoupper($extension) == "PNG" )
                {
                    $image = imagecreatefrompng("${ImageFolder}$path/$file");
                }
                elseif ( strtoupper($extension) == "JPG" ||  strtoupper($extension) == "JPEG")
                {
                    $image = imagecreatefromjpeg("${ImageFolder}$path/$file");
                }
                
                if( false !== $image )
                {
                    $width = imagesx($image);
                    $height = imagesy($image);
                    $size = filesize("${ImageFolder}$path/$file");
                    $colordepth =  imagecolorstotal($image);                    
              
                    print "$spaces <file name='$file' path='$path' colors='$colordepth' width='$width' height='$height' size='$size' />\n";
                    
                    imagedestroy($image);
                }                                
            }
        }
    }
    
    closedir( $dh );
} 
?>
