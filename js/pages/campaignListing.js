var campaignList = [];
var filteredCampaignList = [];
var earliestStartDate = null;
var latestStartDate = null;
const searchFilter = $('#input-search');
const statusFilter = $('#select-status');
const dateRangeFilter = $('#datepicker');
const pageSize = 10;
var currentPage = 0;
var sortState = {};
const cpModel = ['clicks', 'cpm', 'ctr', 'endDate', 'impression', 'name', 'spent', 'startDate', 'status'];

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getStatus(status) {
	if (status === 'PAUSE_NOT_ENOUGH_CREDIT') {
		$('.not-enough-credit').show();
	}
	if (status.includes("ERROR")) {
		return '<div style="position: relative;">' + 
		'<div class="error"><span>Error</span><span class="ex-icon"><i class="fa fa-exclamation" aria-hidden="true"></i></span></div>' +
		'<div class="custom-tooltip shadow rounded"><div>An unexpected error has occurred.</div><div>Please create a new campaign later.</div></div>' +
		'</div>';
	} else if (status.includes("LIVE")) {
		return '<div class="live">Live</div>';
	} else if (status.includes("PAUSE_NOT_ENOUGH_CREDIT")) {
		return '<div class="paused"><span>Paused</span><span class="ex-icon"><i class="fa fa-exclamation" aria-hidden="true"></i></span></div>';
	} else if (status.includes("PAUSE")) {
		return '<div class="paused"><span>Paused</span></div>';
	} else if (status.includes("END")) {
		return  '<div class="end">End</div>';
	}
}

function getCampaignActions(id, status, classes) {
	const edit = '<a cp-action="edit" href="/campaign/edit?id=' + id + '" class="' + classes +'">Edit</a>';
	const pause = '<a cp-action="pause" href="#" cp-id="'+ id +'" class="'+ classes +'">Pause</a>';
	const resume = '<a cp-action="resume" href="#" cp-id="'+ id +'" class="' + classes + '">Resume</a>';
	
	const end = '';
	if (status.includes("ERROR")) {
		return edit;
	} else if (status.includes("LIVE")) {
		return edit + pause;
	} else if (status.includes("PAUSE")) {
		if (status === "PAUSE_NOT_START") {
			return edit;
		} else {
			return edit + resume;
		}
	} else if (status.includes("END")) {
		return end;
	}
}

function initSortState(excludedKey = null) {
	cpModel.forEach(function(key) {
		if (excludedKey !== key) {
			sortState[key] = null;
		}
	})
}

function setSortState(key) {
	initSortState(key);
	if (sortState[key] === 'desc') {
		sortState[key] = 'asc';
	} else {
		sortState[key] = 'desc';
	}
}

function setSortIndicator(key) {
	const sortedColumn = $('th[key="'+key+'"]');
	if (sortState[key] === 'asc') {
		sortedColumn.removeClass();
		sortedColumn.addClass('sorttable_sorted');
	} else if (sortState[key] === 'desc') {
		sortedColumn.removeClass();
		sortedColumn.addClass('sorttable_sorted_reverse');
	} else {
		sortedColumn.removeClass();
	}
}

function sortByColumn(key, cp) {
	const state = sortState[key];
	return cp.sort(function(a, b) {
		if (state === 'asc') {
			if (a[key] > b[key]) {
				return 1;
			} else {
				return -1
			}
		} else {
			if (a[key] > b[key]) {
				return -1;
			} else {
				return 1;
			}
		}
	})
}

function row(cp, customSortKeys) {
	const startDate = new Date(cp.startDate);
	const endDate = new Date(cp.endDate);
	const cpActions = getCampaignActions(cp.campaignId, cp.status, 'dropdown-item');
	
	const actionBtn = cpActions === '' ? '<button disabled class="mdc-icon-button material-icons">' :
			'<button type="cp-action-button" cp-id="' + cp.campaignId + '" cp-status="' + cp.status + '" class="mdc-icon-button material-icons">';
	return '<tr line-id="' + cp.campaignId + '">' +
			'<td>' + cp.name + '</td>' +
			'<td sorttable_customkey="'+moment(startDate).format('YYYYMMDDHHMMSS')+'">' + startDate.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) + '</td>' +
			'<td sorttable_customkey="'+moment(endDate).format('YYYYMMDDHHMMSS')+'">' + endDate.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) + '</td>' +
			'<td sorttable_customkey="'+customSortKeys.impression+'">' + numberWithCommas(cp.impression) + '</td>' +
			'<td sorttable_customkey="'+ customSortKeys.clicks+'">' + numberWithCommas(cp.clicks) + '</td>' +
			'<td sorttable_customkey="'+customSortKeys.ctr+'">' + numberWithCommas(cp.ctr) + '%</td>' +
			'<td sorttable_customkey="'+customSortKeys.cpm+'">$' + numberWithCommas(cp.cpm) + '</td>' +
			'<td sorttable_customkey="'+customSortKeys.spent+'">$' + numberWithCommas(cp.spent) + '</td>' +
			'<td>' + getStatus(cp.status) + '</td>' +
			'<td>' +
				
				'<div class="mdc-menu-surface--anchor">' +
						actionBtn +
						'<i class="fa fa-ellipsis-v" aria-hidden="true"></i>' +
				  	'</button>' +				  	
				  	'<div class="mdc-menu mdc-menu-surface">'+
				  		'<ul class="mdc-list" role="menu" aria-hidden="true" aria-orientation="vertical" tabindex="-1">' +
				  			cpActions +
				  		'</ul>' +
				  	'</div>' +
				  	
				'</div>' +
			'</td>' +
		'</tr>';
}

function calculateCustomSortKey(values, targetValue) {
	return values.sort(function(a, b) { return a - b; }).indexOf(targetValue);
}

function setTableContent(campaignList) {
	$('.sortable thead').empty().append('<tr><th key="name">Name</th><th key="startDate">Start Date</th><th key="endDate">End Date</th><th key="impression">Impression</th><th key="clicks">Clicks</th><th key="ctr">CTR</th><th key="cpm">CPM</th><th key="spent">Spent</th><th key="status">Status</th><th class="sorttable_nosort"></th></tr>');
	$('.sortable tbody').empty();
	const sortKeys  = ['impression', 'clicks', 'ctr', 'cpm', 'spent'];
	const body = campaignList.map(function(cp) {
		const customSortKeys = {};
		sortKeys.map(function(key) {
			const valuesList = campaignList.map(function(cp) { return cp[key]; });
			customSortKeys[key] = calculateCustomSortKey(valuesList, cp[key]);
		})
		return row(cp, customSortKeys);
	});
	$('.no-found').remove();
	if (campaignList.length > 0) {
		$('.sortable tbody').show();
		$('.sortable tbody').append(body);
	} else {
		$('.sortable tbody').hide();
		$('table').append('<div class="no-found" style="text-align: center; margin-top: 20px;">No Results Found</div>');
	}
	
	/* Setup cp menu actions for mobile view */
	const deviceWidth = $(window).width();
	if (deviceWidth <= 600) {
		$('button[type="cp-action-button"]').on('click', function(e) {
			e.preventDefault();
			e.stopPropagation();
			$('.cp-menu-mobile').html(getCampaignActions($(this).attr('cp-id'), $(this).attr('cp-status'), 'cp-menu-item-mobile')).css('display', 'flex').height("100px");
			$('.cp-menu-mobile .cp-menu-item-mobile').on('click', function() { $(this).addClass('active'); })
		})
	} else {
		$('button[type="cp-action-button"]').on('click', function(e) {
			const menu = new mdc.menu.MDCMenu($(this).parent().find('.mdc-menu')[0]);
			menu.setAnchorMargin({left: $(this).offset().left-48, top: 0});
			menu.setFixedPosition(true);
			menu.open = true;
			menu.setAnchorElement($(this)[0]);
			
		});
	}
	
	$('a[cp-action="pause"]').on('click', function(e) {
		e.preventDefault();
		e.stopPropagation();
		$(this).parent().parent().parent().find('button').click();
		$('button').attr('disabled', true);
		$.ajax({
			url: '/ajax/ad/pauseCampaign?cpId=' + $(this).attr('cp-id'),
			type: 'POST',
			beforeSend: function(xhr) {
				$('.table-loading-indicator').show();
			},
			success: function(data) {
				console.log(data);
				window.location.replace("/campaign/listing");
			},
			error: function(err) {console.log(err);},
			complete: function() {
				$('.table-loading-indicator').hide();
			}
		});
	});
	
	$('a[cp-action="edit"]').on('click', function(e) {
		$(this).parent().parent().parent().find('button').click();
	});
	
	$('a[cp-action="resume"]').on('click', function(e) {
		e.preventDefault();
		e.stopPropagation();
		$(this).parent().parent().parent().find('button').click();
		$('button').attr('disabled', true);
		$.ajax({
			url: '/ajax/ad/resumeCampaign?cpId=' + $(this).attr('cp-id'),
			type: 'POST',
			beforeSend: function(xhr) {
				$('.table-loading-indicator').show();
			},
			success: function(data) {
				console.log(data);
				window.location.replace("/campaign/listing");
			},
			error: function(err) {console.log(err);},
			complete: function() {
				$('.table-loading-indicator').hide();
			}
		});
	})
	$('.error').hover(function() {
		console.log('hover');
		$(this).parent().find('.custom-tooltip').show();
	}, function() {
		$(this).parent().find('.custom-tooltip').hide();
	});
	const lastRowTooltip = $('tr:last-child .custom-tooltip');
	if (lastRowTooltip) {
		lastRowTooltip.css('left', '-65px');
		lastRowTooltip.css('top', '-50px');
	}
	$('.custom-tooltip').hover(function() {
		$(this).show();
	}, function() {
		$(this).hide();
	})

	// setup sorting action
	$('th').on('click', function() {
		const key = $(this).attr('key');
		setSortState(key);
		const sortedCp = sortByColumn(key, filteredCampaignList);
		setPaginatedData(currentPage, sortedCp);
		setSortIndicator(key);
	})
	cpModel.forEach(function(key) {
		setSortIndicator(key);
	})
}

function setPage(tp, numPages) {
	if (tp === 'prev') {
		$('li[target-page="next"]').removeClass('disabled');
		if (currentPage === 1) {
			$('li[target-page="prev"]').addClass('disabled');
		}
		if (currentPage !== 0) {
			currentPage = currentPage - 1;
			$('li.page-item.active').removeClass('active').prev().addClass('active');
		}
		
	} else if (tp === 'next') {
		$('li[target-page="prev"]').removeClass('disabled');
		if (currentPage + 2 === numPages) {
			$('li[target-page="next"]').addClass('disabled');
		}
		if (currentPage !== numPages - 1 ) {
			currentPage = currentPage + 1;
			$('li.page-item.active').removeClass('active').next().addClass('active');
		}
	} else {
		currentPage = Number(tp);
		$('li.page-item.active').removeClass('active');
		$('li[target-page="'+ tp + '"]').addClass('active');
		$('li[target-page="next"]').removeClass('disabled');
		$('li[target-page="prev"]').removeClass('disabled');
		if (currentPage === 0) {
			$('li[target-page="prev"]').addClass('disabled');
			
		} else if (currentPage === numPages - 1) {
			
			$('li[target-page="next"]').addClass('disabled');
		}
	}
}

function removePagination() {
	$('.pagination').empty();
}

function createPagination(cp) {
	removePagination();
	let pages = '';
	const numPages = Math.ceil(cp.length / pageSize);
	pages += '<li class="page-item disabled" target-page="prev"><a class="page-link" href="#">Previous</a></li>';
	for (let i=0;i<numPages;i++) {
		if (i === 0) {
			pages += '<li class="page-item active" target-page="'+ i + '"><a class="page-link" href="#">'+ (i+1) +'</a></li>';
		} else {
			pages += '<li class="page-item" target-page="'+ i + '"><a class="page-link" href="#">'+ (i+1) +'</a></li>';
		}
	}
	pages += '<li class="page-item" target-page="next"><a class="page-link" href="#">Next</a></li>';
	$('.pagination').append(pages);
	
	$('.page-item').on('click', function() {
		setPage($(this).attr('target-page'), numPages);
		setPaginatedData(currentPage, filteredCampaignList);
	})
}

function resetPagination() {
	currentPage = 0;
}

function setPaginatedData(targetPage, cp) {
	const start = targetPage * pageSize;
	const end = start + pageSize;
	console.log('start: ', start);
	console.log('end: ', end);
	setTableContent(cp.slice(start, end));
}

function filterCampaigns() {
	const name = $('#input-search').val();
	const status = $('select').val();
	const daterange = $('#datepicker').data('daterangepicker');
	const filteredData = campaignList.filter(function(cp) { return name === "" ? true : cp.name.includes(name);})
									 .filter(function(cp) { return status === "ALL" ? true : cp.status.includes(status);})
									 .filter(function(cp) {return cp.startDate >= new Date(daterange.startDate._d).getTime() && cp.startDate <= new Date(daterange.endDate._d).getTime();});
	filteredCampaignList = filteredData;
	initSortState();
	if (filteredData.length > pageSize) {
		resetPagination();
		setPaginatedData(currentPage, filteredCampaignList);
		createPagination(filteredCampaignList);
	} else {
		resetPagination();
		removePagination();
		setTableContent(filteredData);
	}
}

function cb(start, end) {
    $('#datepicker span').html(start.format('DD MMM YYYY') + ' - ' + end.format('DD MMM YYYY'));
}

function setEsLs(cp) {
	cp.forEach(function(c) {
		if (earliestStartDate === null) {
			earliestStartDate = new Date(c.startDate);
		} else if (c.startDate < earliestStartDate.getTime()) {
			earliestStartDate.setTime(c.startDate);
		}
		if (latestStartDate === null) {
			latestStartDate = new Date(c.startDate);
		} else if (c.startDate > latestStartDate) {
			latestStartDate.setTime(c.startDate);
		}
	})
	initDateRangePicker(moment(earliestStartDate), moment(latestStartDate));
}

function setLastUpdatedTime(lastUpdatedTime) {
	const date = new Date(lastUpdatedTime);
	$('.lastUpdate #timestamp').html(moment(date).format('DD MMM YYYY, HH:mm'));
}

function initDateRangePicker(es, ls) {
	$('#datepicker').daterangepicker({
	    opens: 'left',
	    locale: {
	    	cancelLabel: 'Clear'
	    }
	  }, cb);
	
	if (es._isValid) {
		$('#datepicker').data('daterangepicker').setStartDate(es);
	}
	if (ls._isValid) {
		$('#datepicker').data('daterangepicker').setEndDate(ls);
	}
	
	$('#datepicker').on('apply.daterangepicker', function(ev, picker) {
			$(this).val(picker.startDate.format('DD MMM YYYY') + ' - ' + picker.endDate.format('DD MMM YYYY'));
			filterCampaigns();
	});
	
	$('#datepicker').on('cancel.daterangepicker', function(ev, picker) {
			$(this).data('daterangepicker').setStartDate(earliestStartDate);
			$(this).data('daterangepicker').setEndDate(latestStartDate);
			$('#datepicker span').html('ALL');
			filterCampaigns();
	});
	
	$('#datepicker span').html('ALL');
}

function fetchCampaigns() {
	$.ajax({
		url: '/ajax/ad/getCampaignList',
		method: 'POST',
		dataType: 'json',
		beforeSend: function(xhr) {
			
		},
		success: function(data) {
			campaignList = data.campaigns;
			filteredCampaignList = data.campaigns;
			setEsLs(campaignList);
			if (campaignList.length > pageSize) {
				createPagination(campaignList);
				setPaginatedData(currentPage, filteredCampaignList);
			} else {
				setTableContent(campaignList);
			}
			setLastUpdatedTime(data.lastUpdatedTime.lastExecute);
			initSortState();
		},
		error: function(err) {
		},
		complete: function(xhr, status) {
			
		}
	})
}

function refresh() {
	
}



$(document).ready(function() {	
	const deviceWidth = $(window).width();
	const deviceHeight = $(window).height();
	if (deviceWidth <= 600) {
		const tableWidth = deviceWidth - 20;
		$('.table-container').css('max-width', tableWidth);
		$('thead').css('max-width', tableWidth);
		$('tbody').css('max-width', tableWidth);
		
		const tableHeight = deviceHeight - 250;
		$('tbody').css('max-height', tableHeight);
	}
	
	$('tbody').scroll(function() {
		$('thead').scrollLeft($(this).scrollLeft());
	});
	
	fetchCampaigns();
	
	$('#search-btn').on('click', function(e) {
		e.preventDefault();
		filterCampaigns();
	})
	
	$('select').selectpicker();
	$('select').on('changed.bs.select', function (e, clickedIndex, isSelected, previousValue) {
		filterCampaigns();
	});
})

$(document).on('click', function(evt) {
	const deviceWidth = $(window).width();
	if (deviceWidth <= 600) {
		if (evt.target !== $('.cp-menu-mobile')[0] && !$('.cp-menu-mobile').has(evt.target).length) {
			$('.cp-menu-mobile').height('0').css('display', 'none');
		}
	}
})