#!/bin/bash
#Postcode cleanup GE17

# Start by sourcing the latest ONSPD file from the Office for National Statistics. Unzip and place in the same directory as this script. Specify its path in the postcodeSourceFile variable.
# TODO: wget this file directly if location is predictable.

postcodeSourceFile = "ONSPD_FEB_2017_UK.csv"

#Minimise large dataset
csvcut -c 3,18,5 $postcodeSourceFile >postcodesMin.csv

#remove postcodes with terminated date and remove that column
csvgrep -c 5 -r "^$" postcodesMin.csv | csvcut -c 1-2 >postcodesMin2.csv

#Split into outcode files
mkdir ../data/outcodes
while read outcode content
do
	file="../data/outcodes/"$outcode".csv"
	if [ ! -f "$file" ]; 
	then	
		echo $file "not found so creating"
		touch $file
		echo "\"pc\",\"ca\"" >$file
	fi
	echo $content >>$file
	echo $outcode $content "done."
done <postcodesMin2.csv 

#clean up
rm postcodesMin.csv
rm postcodesMin2.csv
rm $postcodeSourceFile