import os
import pathlib
import shutil
import json
import sys
import time

# Author: aarontburn
# Module Exporter

# Usage Information:
# 
# Step 1: Change this to the name of folder containing your module
# 
MODULE_NAME = 'sample_module' # Change this to the name of folder containing your module
# 
# Step 2: Copy the resulting folder in ./output/ folder to the {HOME}/.modules/external_modules 
# 
# 


PWD = str(pathlib.Path(__file__).parent.resolve())
OUTPUT_FOLDER_PATH = PWD + "/output/" + MODULE_NAME + "/"
NODE_MODULES_PATH = PWD + "/node_modules"

print("\n\tCREATING FOLDERS\n")
# Step 0: Create output folder
try:
    os.makedirs(OUTPUT_FOLDER_PATH)
except FileExistsError:
    print("Skipping creation of " + OUTPUT_FOLDER_PATH + "; folder already exists")
    
    
# Step 1: Create empty folder module_builder
try:
    os.makedirs(OUTPUT_FOLDER_PATH + "module_builder")
except FileExistsError:
    print("Skipping creation of " + OUTPUT_FOLDER_PATH + "module_builder; folder already exists")
    
try:
    os.makedirs(OUTPUT_FOLDER_PATH + "node_modules")
except FileExistsError:
    print("Skipping creation of " + OUTPUT_FOLDER_PATH + "node_modules; folder already exists")


# Step 2: Copy all files from module folder into output folder
print("\n\tCOPYING FILES\n")


# Path of current file
path = PWD + "/src/" + MODULE_NAME+ "/"

for file in os.listdir(path):
    full_file_path = path + file
    output_file_path = OUTPUT_FOLDER_PATH + file
    
    if (os.path.isfile(full_file_path)):
        print("Copying '" + full_file_path + "' to output folder ('" + output_file_path + "')")
        shutil.copyfile(full_file_path, output_file_path)

# Step 3: Parse package.json for dependencies
file_text = ''
with open("package.json", "r") as file:
    file_text = file.read()

if file_text == '':
    print("Could not open package.json")
    sys.exit()

package_json = json.loads(file_text)
dependencies = package_json['dependencies']

if (len(dependencies.keys()) > 0):
    print("\n\tBUNDLING DEPENDENCIES\n")


node_modules = os.listdir(NODE_MODULES_PATH)
for dependency_name in dependencies.keys():
    # version = dependencies[dependency]
    try:
        index = node_modules.index(dependency_name)
    except ValueError:
        print(dependency_name + " was not found in node_modules. Skipping...")
        continue
    dependency_path = NODE_MODULES_PATH + "/" + dependency_name
    try:
        print("Copying '" + dependency_path + "' to '" + OUTPUT_FOLDER_PATH + "node_modules/'")
        shutil.copytree(dependency_path, OUTPUT_FOLDER_PATH + "node_modules/" + dependency_name)
    except FileExistsError:
        print("Replacing existing dependency from '" + dependency_path + "' to '" + OUTPUT_FOLDER_PATH + "node_modules/'")
        shutil.rmtree(OUTPUT_FOLDER_PATH + "node_modules/" + dependency_name)
        time.sleep(0.1) # Add small delay
        shutil.copytree(dependency_path, OUTPUT_FOLDER_PATH + "node_modules/" + dependency_name)  
        

# def make_archive(source, destination):
#     base_name = '.'.join(destination.split('.')[:-1])
#     format = destination.split('.')[-1]
#     root_dir = os.path.dirname(source)
#     base_dir = os.path.basename(source.strip(os.sep))
#     shutil.make_archive(base_name, format, root_dir, base_dir)      
    
      
# # Zip output
# make_archive(OUTPUT_FOLDER_PATH, OUTPUT_FOLDER_PATH[:-1] + ".zip")       

# # Delete folder
# shutil.rmtree(OUTPUT_FOLDER_PATH)
    
print("\n\tFINISHED BUNDLING MODULE\n")

    
