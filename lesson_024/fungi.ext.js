//https://www.youtube.com/watch?v=aQiWF4E8flQ

//Built quick sort function based on the explaination from a youtube video
//Need to update the function to handle the ability to pass in a compare function
//to allow to do custom comparisons. Thinking about using this to help sort
//objects in a scene to render them more efficiently.

function quickSort(ary){
	var partition = [{start:0,end:ary.length-1}],
		pos,		//Current position of the partition
		pivot,		//Main Item to use to compare with the other items
		i,			//For loop, reuse variable
		tmp,		//tmp var to hold item when swopping them in the array
		posStart;	//save starting pos to help partition the current partition

	while(partition.length > 0){
		pos = partition.pop();	//Get a partition to process.
		posStart = pos.start;
		pivot = ary[pos.end];
		
		for(i = pos.start; i < pos.end; i++){
			//Swop the current item with the start item, then move the start position up.
			if(ary[i] <= pivot){
				tmp = ary[i];
				ary[i] = ary[pos.start];
				ary[pos.start] = tmp;
				pos.start++;
			}
		}

		//Now move the first item to the end then save the pivot to the start position
		//Because everything before the new start position should be less then the pivot.
		ary[pos.end] = ary[pos.start];
		ary[pos.start] = pivot;

		//Determine if can divide the current partition into sub partitions.
		if(posStart < pos.start-1)	partition.push( {start:posStart,end:pos.start-1} );	//Left Partition
		if(pos.start+1 < pos.end)	partition.push( {start:pos.start+1,end:pos.end} );	//Right Partition
	}
}