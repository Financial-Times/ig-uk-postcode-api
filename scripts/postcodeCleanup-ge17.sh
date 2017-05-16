#!/bin/bash
#Postcode cleanup

# get NSPL file https://geoportal.statistics.gov.uk/Docs/PostCodes/NSPL_MAY_2016_csv.zip
# get ONSPD file https://geoportal.statistics.gov.uk/Docs/PostCodes/ONSPD_MAY_2016_csv.zip

#Minimise large dataset
csvcut -c 3,15,16,7,52,53,5 ONSPD_MAY_2016_UK.csv >postcodeMin.csv

#Change Scotland, Wales, NI to Region name

sed -E "s/S99999999/S92000003/g;s/N[0-9]{8}/N92000002/g;s/W99999999/W92000004/g" postcodesMin.csv | csvcut -c 1,3- >postcodesMin2.csv

#remove postcodes with terminated date and remove that column
csvgrep -c 6 -r "^$" postcodesMin2.csv | csvcut -c 1-5 >postcodesMin3.csv

#remove non-geo postcodes and channel islands and remove NI LA details
csvgrep -c 4 -i -r "^99\." postcodesMin3.csv | sed -E s/N[0-9]{8}/N92000002/g >postcodesMin4.csv

#Append Gibraltar
echo "GX11 1AA,G99999999,G99999999,36.138803,-5.348583" >>postcodesMin4.csv

#reduce file to postcode and LA
csvcut -c 1,3 >postcodesMin99.csv

#Split into outcode files
mkdir outcodes
while read outcode content
do
	file="outcodes/"$outcode".csv"
	if [ ! -f "$file" ]; 
	then	
		echo $file "not found so creating"
		touch $file
		echo "\"pc\",\"ca\"" >$file
	fi
	echo $content >>$file
	echo $outcode $content "done."
done <postcodesMin99.csv 

#add Gibraltar
touch outcodes/GX11.csv
echo "\"pc\",\"ca\"" >outcodes/GX11.csv
echo "1AA,G99999999" >outcodes/GX11.csv

#Check files for
for file in outcodes/*.csv
do
	csvstat $file
done